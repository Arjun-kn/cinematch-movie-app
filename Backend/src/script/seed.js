const { initDB, getDriver } = require('../config/db');

const seedDatabase = async () => {
  initDB();
  const driver = getDriver();
  const session = driver.session();

  console.log('Clearing existing graph database...');

  try {

    await session.executeWrite(tx => tx.run('MATCH (n) DETACH DELETE n'));

    console.log('Seeding database nodes and relationships...');

    const seedQuery = `
      // 1. Create Users
      CREATE (u1:User {id: 'u1', name: 'Arjun Chauhan', email: 'arjun@example.com', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'})
      CREATE (u2:User {id: 'u2', name: 'Priya Sharma', email: 'priya@example.com', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'})
      CREATE (u3:User {id: 'u3', name: 'Rahul Verma', email: 'rahul@example.com', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150'})
      CREATE (u4:User {id: 'u4', name: 'Ananya Roy', email: 'ananya@example.com', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150'})
      CREATE (u5:User {id: 'u5', name: 'Vikram Singh', email: 'vikram@example.com', avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150'})

      // 2. Create Friend Connections (Social Graph)
      CREATE (u1)-[:FRIEND_WITH]->(u2)
      CREATE (u1)-[:FRIEND_WITH]->(u3)
      CREATE (u2)-[:FRIEND_WITH]->(u4)
      CREATE (u3)-[:FRIEND_WITH]->(u5)

      //Genres
      CREATE (g1:Genre {id: 'g1', name: 'Sci-Fi'})
      CREATE (g2:Genre {id: 'g2', name: 'Action'})
      CREATE (g3:Genre {id: 'g3', name: 'Drama'})

      //Actors & Directors
      CREATE (p1:Person {id: 'p1', name: 'Christopher Nolan', role: 'Director'})
      CREATE (p2:Person {id: 'p2', name: 'Cillian Murphy', role: 'Actor'})
      CREATE (p3:Person {id: 'p3', name: 'Leonardo DiCaprio', role: 'Actor'})
      CREATE (p4:Person {id: 'p4', name: 'Denis Villeneuve', role: 'Director'})

      // 5.Movies 
      CREATE (m1:Movie {
        id: 'm1',
        title: 'Oppenheimer',
        releaseYear: 2023,
        rating: 8.9,
        posterUrl: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600'
      })
      CREATE (m2:Movie {
        id: 'm2',
        title: 'Inception',
        releaseYear: 2010,
        rating: 8.8,
        posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600'
      })
      CREATE (m3:Movie {
        id: 'm3',
        title: 'Dune: Part Two',
        releaseYear: 2024,
        rating: 8.6,
        posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600'
      })

      // Link Movies to Genres & People
      CREATE (m1)-[:IN_GENRE]->(g3)
      CREATE (m2)-[:IN_GENRE]->(g1)
      CREATE (m2)-[:IN_GENRE]->(g2)
      CREATE (m3)-[:IN_GENRE]->(g1)

      CREATE (p1)-[:DIRECTED]->(m1)
      CREATE (p1)-[:DIRECTED]->(m2)
      CREATE (p2)-[:ACTED_IN]->(m1)
      CREATE (p3)-[:ACTED_IN]->(m2)
      CREATE (p4)-[:DIRECTED]->(m3)

      //Dynamic Theaters
      CREATE (t1:Theater {id: 't1', name: 'PVR Directors Cut', city: 'Mumbai', location: 'Lower Parel • Screen 1'})
      CREATE (t2:Theater {id: 't2', name: 'INOX Megaplex', city: 'Mumbai', location: 'Nariman Point • Screen 3'})
      CREATE (t3:Theater {id: 't3', name: 'Cinepolis Nexus', city: 'Mumbai', location: 'Seawoods • Screen 2'})
      CREATE (t4:Theater {id: 't4', name: 'PVR ICON IMAX', city: 'Mumbai', location: 'Versova • Screen 5'})

      // 7.Showtimes with Timezones for Oppenheimer (m1)
      CREATE (s1:Showtime {id: 's1', time: '06:00 PM (IST)', format: 'IMAX 3D', totalSeats: 70})
      CREATE (s2:Showtime {id: 's2', time: '09:00 PM (IST)', format: '4K Dolby Atmos', totalSeats: 70})
      CREATE (s3:Showtime {id: 's3', time: '02:30 PM (IST)', format: '2D', totalSeats: 70})

      CREATE (s1)-[:SHOWS_MOVIE]->(m1)
      CREATE (s1)-[:AT_THEATER]->(t1)

      CREATE (s2)-[:SHOWS_MOVIE]->(m1)
      CREATE (s2)-[:AT_THEATER]->(t2)

      CREATE (s3)-[:SHOWS_MOVIE]->(m1)
      CREATE (s3)-[:AT_THEATER]->(t3)

      // Dynamic Showtimes for Inception (m2)
      CREATE (s4:Showtime {id: 's4', time: '04:00 PM (IST)', format: '4K Dolby Atmos' totalSeats: 70})
      CREATE (s5:Showtime {id: 's5', time: '08:30 PM (IST)', format: 'IMAX 3D', totalSeats: 70})

      CREATE (s4)-[:SHOWS_MOVIE]->(m2)
      CREATE (s4)-[:AT_THEATER]->(t2)

      CREATE (s5)-[:SHOWS_MOVIE]->(m2)
      CREATE (s5)-[:AT_THEATER]->(t4)

      // Dynamic Showtimes for Dune: Part Two (m3)
      CREATE (s6:Showtime {id: 's6', time: '07:15 PM (IST)', format: 'IMAX 3D',  totalSeats: 70})
      CREATE (s7:Showtime {id: 's7', time: '10:00 PM (IST)', format: '2D',  totalSeats: 70})

      CREATE (s6)-[:SHOWS_MOVIE]->(m3)
      CREATE (s6)-[:AT_THEATER]->(t1)

      CREATE (s7)-[:SHOWS_MOVIE]->(m3)
      CREATE (s7)-[:AT_THEATER]->(t3)

      //Seat Types / Tiers
      CREATE (c1:SeatType {id: 'c1', name: 'VIP Recliner', price: 650})
      CREATE (c2:SeatType {id: 'c2', name: 'Executive Premium', price: 450})
      CREATE (c3:SeatType {id: 'c3', name: 'Standard Club', price: 300})

      // Link SeatTypes to Showtimes
      CREATE (s1)-[:HAS_SEAT_TYPE]->(c1)
      CREATE (s1)-[:HAS_SEAT_TYPE]->(c2)
      CREATE (s1)-[:HAS_SEAT_TYPE]->(c3)

      CREATE (s2)-[:HAS_SEAT_TYPE]->(c1)
      CREATE (s2)-[:HAS_SEAT_TYPE]->(c2)
      CREATE (s2)-[:HAS_SEAT_TYPE]->(c3)

      CREATE (s3)-[:HAS_SEAT_TYPE]->(c1)
      CREATE (s3)-[:HAS_SEAT_TYPE]->(c2)
      CREATE (s3)-[:HAS_SEAT_TYPE]->(c3)

      CREATE (s4)-[:HAS_SEAT_TYPE]->(c1)
      CREATE (s4)-[:HAS_SEAT_TYPE]->(c2)
      CREATE (s4)-[:HAS_SEAT_TYPE]->(c3)

      CREATE (s5)-[:HAS_SEAT_TYPE]->(c1)
      CREATE (s5)-[:HAS_SEAT_TYPE]->(c2)
      CREATE (s5)-[:HAS_SEAT_TYPE]->(c3)

      CREATE (s6)-[:HAS_SEAT_TYPE]->(c1)
      CREATE (s6)-[:HAS_SEAT_TYPE]->(c2)
      CREATE (s6)-[:HAS_SEAT_TYPE]->(c3)

      CREATE (s7)-[:HAS_SEAT_TYPE]->(c1)
      CREATE (s7)-[:HAS_SEAT_TYPE]->(c2)
      CREATE (s7)-[:HAS_SEAT_TYPE]->(c3)

     
      CREATE (u2)-[:BOOKED {seatNo: 'C4', seatType: 'Executive Premium', totalAmount: 450, bookedAt: '2026-08-18'}]->(s1)
      CREATE (u4)-[:BOOKED {seatNo: 'C5', seatType: 'Executive Premium', totalAmount: 450, bookedAt: '2026-08-19'}]->(s1)
      CREATE (u2)-[:BOOKED_TIER]->(c2)
      CREATE (u4)-[:BOOKED_TIER]->(c2)

      
      CREATE (u3)-[:BOOKED {seatNo: 'A1', seatType: 'VIP Recliner', totalAmount: 650, bookedAt: '2026-08-20'}]->(s4)
      CREATE (u3)-[:BOOKED_TIER]->(c1)

    
      CREATE (u2)-[:BOOKED {seatNo: 'B2', seatType: 'VIP Recliner', totalAmount: 650, bookedAt: '2026-08-21'}]->(s6)
      CREATE (u2)-[:BOOKED_TIER]->(c1)
    `;

    await session.executeWrite(tx => tx.run(seedQuery));
    console.log('Seeding completed successfully with dynamic theaters, showtimes (IST), seat types & social bookings!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await session.close();
    await driver.close();
    process.exit(0);
  }
};

seedDatabase();
