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

const createBooking = async (req, res) => {
  const { userId, showtimeId, seatNo, seatNos, totalAmount, snacks, paymentMethod } = req.body;
  const seatsToBook = seatNos && Array.isArray(seatNos) ? seatNos : (seatNo ? [seatNo] : []);

 
  if (!userId || !showtimeId || seatsToBook.length === 0) {
    return res.status(400).json({ success: false, message: 'Missing required booking parameters' });
  }

  const session = getDriver().session();

  try {
    const bookingId = 'BK-' + Math.floor(100000 + Math.random() * 900000);
    const bookedAt = new Date().toISOString();
    const snacksJson = JSON.stringify(snacks || []);

    const cypher = `
      MATCH (u:User {id: $userId})
      MATCH (s:Showtime {id: $showtimeId})
      MATCH (s)-[:SHOWS_MOVIE]->(m:Movie)
      MATCH (s)-[:AT_THEATER]->(t:Theater)
      UNWIND $seatsToBook AS seat
      CREATE (u)-[r:BOOKED {
        bookingId: $bookingId,
        seatNo: seat,
        bookedAt: $bookedAt,
        totalAmount: $totalAmount,
        snacks: $snacksJson,
        paymentMethod: $paymentMethod
      }]->(s)
      RETURN u.name AS userName, 
             collect(seat) AS bookedSeats, 
             s.time AS time, 
             m.title AS movieTitle, 
             m.posterUrl AS posterUrl,
             t.name AS theaterName
    `;

    const result = await session.executeWrite(tx =>
      tx.run(cypher, { 
        userId, 
        showtimeId, 
        seatsToBook, 
        bookingId, 
        bookedAt, 
        totalAmount: totalAmount || 0,
        snacksJson,
        paymentMethod: paymentMethod || 'UPI'
      })
    );

    if (!result.records || result.records.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User or Showtime node not found in database.'
      });
    }

    const record = result.records[0];
    
    return res.json({
      success: true,
      data: cleanNeo4jValue({
        bookingId,
        userName: record.get('userName'),
        seatNo: seatsToBook.join(', '),
        seatNos: seatsToBook,
        time: record.get('time'),
        movieTitle: record.get('movieTitle'),
        posterUrl: record.get('posterUrl'),
        theaterName: record.get('theaterName'),
        totalAmount: totalAmount || 0,
        bookedAt
      }),
    });

  } catch (error) {
    console.error('Cypher Booking Query Error:', error);

    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Booking failed on database server' 
    });

  } finally {
    await session.close();
  }
};

const getUserBookings = async (req, res) => {
  const { userId } = req.params;
  const session = getDriver().session();

  try {
    const cypher = `
      MATCH (u:User {id: $userId})-[r:BOOKED]->(s:Showtime)-[:SHOWS_MOVIE]->(m:Movie)
      MATCH (s)-[:AT_THEATER]->(t:Theater)
      RETURN r.bookingId AS bookingId,
             r.seatNo AS seatNo,
             r.bookedAt AS bookedAt,
             r.totalAmount AS totalAmount,
             r.snacks AS snacks,
             r.paymentMethod AS paymentMethod,
             s.id AS showtimeId,
             s.time AS showtime,
             m.title AS movieTitle,
             m.posterUrl AS posterUrl,
             t.name AS theaterName
      ORDER BY r.bookedAt DESC
    `;

    const result = await session.executeRead(tx => tx.run(cypher, { userId }));
    

    const bookingsMap = {};
    result.records.forEach(record => {
      const bId = record.get('bookingId') || `BK-${record.get('seatNo')}`;
      if (!bookingsMap[bId]) {
        bookingsMap[bId] = {
          bookingId: bId,
          movieTitle: record.get('movieTitle'),
          posterUrl: record.get('posterUrl'),
          theaterName: record.get('theaterName'),
          showtime: record.get('showtime'),
          bookedAt: record.get('bookedAt'),
          totalAmount: cleanNeo4jValue(record.get('totalAmount')) || 450,
          paymentMethod: record.get('paymentMethod') || 'UPI',
          seats: []
        };
      }
      bookingsMap[bId].seats.push(record.get('seatNo'));
    });

    const bookings = Object.values(bookingsMap);

    res.json({ success: true, data: cleanNeo4jValue(bookings) });
  } catch (error) {
    console.error('Failed to fetch user bookings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user bookings' });
  } finally {
    await session.close();
  }
};

module.exports = { createBooking, getUserBookings };