const neo4j = require('neo4j-driver');
const { getDriver } = require('../config/db');


const cleanNeo4jValue = (val) => {
  if (val === null || val === undefined) return val;
  if (neo4j.isInt && neo4j.isInt(val)) return val.toNumber();
  if (typeof val === 'object' && 'low' in val && typeof val.low === 'number') return val.low;
  if (Array.isArray(val)) return val.map(cleanNeo4jValue);
  if (typeof val === 'object' && val !== null) {
    const res = {};
    for (const key of Object.keys(val)) {
      res[key] = cleanNeo4jValue(val[key]);
    }
    return res;
  }
  return val;
};


const getRecommendations = async (req, res) => {
  const { userId } = req.params;
  const session = getDriver().session();

  try {
    const cypher = `
      MATCH (u:User {id: $userId})
      MATCH path = (u)-[:FRIEND_WITH*1..2]-(friend:User)
      MATCH (friend)-[:BOOKED]->(s:Showtime)-[:SHOWS_MOVIE]->(m:Movie)
      WHERE NOT (u)-[:BOOKED]->(:Showtime)-[:SHOWS_MOVIE]->(m)
      WITH m, friend, min(length(path)) AS hop
      RETURN DISTINCT m.id AS id, m.title AS title, m.posterUrl AS posterUrl, 
             m.rating AS rating, m.releaseYear AS releaseYear,
             collect(DISTINCT CASE WHEN hop = 1 THEN friend.name END) AS directFriends,
             collect(DISTINCT CASE WHEN hop = 2 THEN friend.name END) AS friendOfFriends
    `;

    const result = await session.executeRead(tx => tx.run(cypher, { userId }));
    
    const recommendations = result.records.map(record => {
      const directFriends = (record.get('directFriends') || []).filter(Boolean);
      const friendOfFriends = (record.get('friendOfFriends') || []).filter(Boolean);
      
      return {
        id: record.get('id'),
        title: record.get('title'),
        posterUrl: record.get('posterUrl'),
        rating: cleanNeo4jValue(record.get('rating')),
        releaseYear: cleanNeo4jValue(record.get('releaseYear')),
        directFriends,
        friendOfFriends,
        recommendedBy: [
          ...directFriends.map(f => `${f} (Friend)`),
          ...friendOfFriends.map(f => `${f} (2nd-Degree Friend)`)
        ]
      };
    });

    res.json({ success: true, data: cleanNeo4jValue(recommendations) });
  } catch (error) {
    console.error('Failed to fetch recommendations:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recommendations' });
  } finally {
    await session.close();
  }
};

// Fetch Nodes and Links 
const getMovieGraph = async (req, res) => {
  const { movieId } = req.params;
  const session = getDriver().session();

  try {
    const cypher = `
      MATCH (m:Movie {id: $movieId})
      OPTIONAL MATCH (p:Person)-[r1:ACTED_IN|DIRECTED]->(m)
      OPTIONAL MATCH (m)-[r2:IN_GENRE]->(g:Genre)
      OPTIONAL MATCH (s:Showtime)-[:SHOWS_MOVIE]->(m)
      OPTIONAL MATCH (s)-[:AT_THEATER]->(t:Theater)
      OPTIONAL MATCH (s)-[:HAS_SEAT_TYPE]->(c:SeatType)
      OPTIONAL MATCH (u:User)-[r3:BOOKED]->(s)
      RETURN m, 
             collect(DISTINCT p) AS people, 
             collect(DISTINCT g) AS genres, 
             collect(DISTINCT s) AS showtimes,
             collect(DISTINCT t) AS theaters,
             collect(DISTINCT c) AS seatTypes,
             collect(DISTINCT u) AS viewers
    `;

    const result = await session.executeRead(tx => tx.run(cypher, { movieId }));
    const record = result.records[0];

    if (!record) {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }

    const movie = cleanNeo4jValue(record.get('m').properties);
    const people = record.get('people').map(p => cleanNeo4jValue(p.properties));
    const genres = record.get('genres').map(g => cleanNeo4jValue(g.properties));
    const showtimes = record.get('showtimes').map(s => cleanNeo4jValue(s.properties));
    const theaters = record.get('theaters').map(t => cleanNeo4jValue(t.properties));
    const seatTypes = record.get('seatTypes').map(c => cleanNeo4jValue(c.properties));
    const viewers = record.get('viewers').map(u => cleanNeo4jValue(u.properties));

    const nodes = [{ id: movie.id, name: movie.title, group: 'Movie' }];
    const links = [];

    people.forEach(p => {
      nodes.push({ id: p.id, name: p.name, group: 'Person' });
      links.push({ source: p.id, target: movie.id, label: p.role });
    });

    genres.forEach(g => {
      nodes.push({ id: g.id, name: g.name, group: 'Genre' });
      links.push({ source: movie.id, target: g.id, label: 'IN_GENRE' });
    });

    theaters.forEach(t => {
      nodes.push({ id: t.id, name: t.name, group: 'Theater' });
    });

    seatTypes.forEach(c => {
      nodes.push({ id: c.id, name: c.name, group: 'SeatType' });
    });

    showtimes.forEach(s => {
      nodes.push({ id: s.id, name: `${s.time} (${s.format})`, group: 'Showtime' });
      links.push({ source: s.id, target: movie.id, label: 'SHOWS_MOVIE' });
    });

    viewers.forEach(u => {
      nodes.push({ id: u.id, name: u.name, group: 'User' });
      links.push({ source: u.id, target: movie.id, label: 'BOOKED' });
    });

    res.json({ success: true, data: { nodes, links } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to build graph topology' });
  } finally {
    await session.close();
  }
};

//Dynamic Showtimes & Theaters 
const getShowtimesForMovie = async (req, res) => {
  const { movieId } = req.params;
  const { userId } = req.query;
  const session = getDriver().session();

  try {
    const cypher = `
      MATCH (s:Showtime)-[:SHOWS_MOVIE]->(m:Movie {id: $movieId})
      MATCH (s)-[:AT_THEATER]->(t:Theater)
      OPTIONAL MATCH (u:User)-[r:BOOKED]->(s)
      OPTIONAL MATCH path = (me:User {id: $userId})-[:FRIEND_WITH*1..2]-(u)
      WITH s, t, u, r, min(length(path)) AS hop
      WITH s, t, collect(DISTINCT CASE WHEN u IS NOT NULL THEN {
        userId: u.id,
        userName: u.name,
        userAvatar: u.avatar,
        seatNo: r.seatNo,
        seatType: r.seatType,
        hop: hop,
        relationType: CASE WHEN hop = 1 THEN 'FRIEND' WHEN hop = 2 THEN 'FRIEND_OF_FRIEND' ELSE 'OTHER' END,
        isFriend: CASE WHEN hop = 1 OR hop = 2 THEN true ELSE false END
      } END) AS bookings
      RETURN s.id AS id, s.time AS time, s.format AS format, s.price AS basePrice, s.totalSeats AS totalSeats,
             t.id AS theaterId, t.name AS theaterName, t.city AS city, t.location AS location,
             bookings
      ORDER BY t.name ASC, s.time ASC
    `;

    const result = await session.executeRead(tx => tx.run(cypher, { movieId, userId: userId || '' }));
    
    const showtimes = result.records.map(record => {
      const rawBookings = record.get('bookings') || [];
      const cleanedBookings = rawBookings
        .filter(b => b && b.userId)
        .map(b => cleanNeo4jValue(b));

      const friendBookings = cleanedBookings.filter(b => b.isFriend);
      const directFriendBookings = cleanedBookings.filter(b => b.relationType === 'FRIEND');
      const fofBookings = cleanedBookings.filter(b => b.relationType === 'FRIEND_OF_FRIEND');

      const rawBasePrice = record.get('basePrice');
      const rawTotalSeats = record.get('totalSeats');

      return {
        id: record.get('id'),
        time: record.get('time'),
        format: record.get('format') || '2D',
        basePrice: cleanNeo4jValue(rawBasePrice) || 450,
        totalSeats: cleanNeo4jValue(rawTotalSeats) || 70,
        theater: {
          id: record.get('theaterId'),
          name: record.get('theaterName'),
          city: record.get('city'),
          location: record.get('location') || `${record.get('city')} • Screen 1`
        },
        friendBookings,
        directFriendBookings,
        fofBookings,
        allBookings: cleanedBookings
      };
    });

    res.json({ success: true, data: cleanNeo4jValue(showtimes) });
  } catch (error) {
    console.error('Failed to fetch dynamic showtimes:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dynamic showtimes' });
  } finally {
    await session.close();
  }
};

//  Booked Seats for a Showtime 
const getShowtimeSeats = async (req, res) => {
  const { showtimeId } = req.params;
  const { userId } = req.query;
  const session = getDriver().session();

  try {
    const cypher = `
      MATCH (u:User)-[r:BOOKED]->(s:Showtime {id: $showtimeId})
      OPTIONAL MATCH path = (me:User {id: $userId})-[:FRIEND_WITH*1..2]-(u)
      WITH u, r, min(length(path)) AS hop
      RETURN r.seatNo AS seatNo, r.seatType AS seatType, u.id AS userId, u.name AS userName, u.avatar AS userAvatar,
             hop,
             CASE 
               WHEN hop = 1 THEN 'FRIEND' 
               WHEN hop = 2 THEN 'FRIEND_OF_FRIEND' 
               ELSE 'OTHER' 
             END AS relationType
    `;

    const result = await session.executeRead(tx => tx.run(cypher, { showtimeId, userId: userId || '' }));
    
    const bookedSeats = {};
    result.records.forEach(record => {
      const seatNo = record.get('seatNo');
      const relationType = record.get('relationType');
      const rawHop = record.get('hop');
      const hop = cleanNeo4jValue(rawHop);

      bookedSeats[seatNo] = {
        userId: record.get('userId'),
        userName: record.get('userName'),
        userAvatar: record.get('userAvatar'),
        seatType: record.get('seatType'),
        hop,
        relationType,
        isFriend: relationType === 'FRIEND' || relationType === 'FRIEND_OF_FRIEND',
        isDirectFriend: relationType === 'FRIEND',
        isFriendOfFriend: relationType === 'FRIEND_OF_FRIEND'
      };
    });

    res.json({ success: true, data: cleanNeo4jValue(bookedSeats) });
  } catch (error) {
    console.error('Failed to fetch seat layout:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch seat layout' });
  } finally {
    await session.close();
  }
};

// 5. Fetch All Movies with Friend & Friend-of-Friend Recommendations Attached
const getAllMovies = async (req, res) => {
  const { userId } = req.query;
  const session = getDriver().session();

  try {
    const cypher = `
      MATCH (m:Movie)
      OPTIONAL MATCH (u:User {id: $userId})
      OPTIONAL MATCH path = (u)-[:FRIEND_WITH*1..2]-(friend:User)
      OPTIONAL MATCH (friend)-[:BOOKED]->(s:Showtime)-[:SHOWS_MOVIE]->(m)
      WITH m, friend, min(length(path)) AS hop
      RETURN m.id AS id, m.title AS title, m.posterUrl AS posterUrl, m.rating AS rating, m.releaseYear AS releaseYear,
             collect(DISTINCT CASE WHEN hop = 1 THEN friend.name END) AS directFriends,
             collect(DISTINCT CASE WHEN hop = 2 THEN friend.name END) AS friendOfFriends
    `;

    const result = await session.executeRead(tx => tx.run(cypher, { userId: userId || '' }));
    
    const movies = result.records.map(record => {
      const directFriends = (record.get('directFriends') || []).filter(Boolean);
      const friendOfFriends = (record.get('friendOfFriends') || []).filter(Boolean);

      return {
        id: record.get('id'),
        title: record.get('title'),
        posterUrl: record.get('posterUrl'),
        rating: cleanNeo4jValue(record.get('rating')),
        releaseYear: cleanNeo4jValue(record.get('releaseYear')),
        directFriends,
        friendOfFriends,
        recommendedBy: [
          ...directFriends.map(f => `${f} (Friend)`),
          ...friendOfFriends.map(f => `${f} (2nd-Degree Friend)`)
        ]
      };
    });

    res.json({ success: true, data: cleanNeo4jValue(movies) });
  } catch (error) {
    console.error('Failed to fetch movies:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch movies' });
  } finally {
    await session.close();
  }
};

module.exports = { getRecommendations, getMovieGraph, getShowtimesForMovie, getShowtimeSeats, getAllMovies };