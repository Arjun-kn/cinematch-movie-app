CineMatch - Social Movie Recommendation & Seat Booking System

CineMatch is a movie recommendation and ticket booking app. It shows movies recommended by your Direct Friends (1st Degree) and Friends of Friends (2nd Degree), and lets you select dynamic cinema seats just like BookMyShow!

-->System Architecture (HLD Diagram)

+-----------------------------------------------------------------------+
| React Frontend |
| (Axios / Fetch Requests) |
+-----------------------------------+-+---------------------------------+
| |
| | HTTP REST Requests ^ JSON Response
v | |
+-------------------------------------+---------------------------------+
| Express.js API Server |
| |
| +------------------+ +------------------+ +---------------+ |
| | API Routes | --> | Controllers | --> | Driver | |
| | (/api/movies) | | (Cypher Exec) | | Connection | |
| +------------------+ +------------------+ +---------------+ |
+-------------------------------------+---------------------------------+
| |
| | Bolt Connection (bolt+s://) ^ Cypher Records
v | |
+-------------------------------------+---------------------------------+
| CognoDB Cloud |
| (Neo4j Graph Database) |
+-----------------------------------------------------------------------+



-->Graph Database Model & Schema Diagram

```text
+-------------------+                   +-------------------+
|    (u:User)       | --[:FRIEND_WITH]->|    (f:User)       |
| id, name, email   |                   | id, name, email   |
+-------------------+                   +---------+---------+
                                                  |
                                                  | [:BOOKED {seatNo, seatType}]
                                                  v
                                        +-------------------+
                                        |    (s:Showtime)   |
                                        | time, format, cap |
                                        +----+---------+----+
                                             |         |
                          [:SHOWS_MOVIE]     |         | [:AT_THEATER]
             +-------------------------------+         +-------------------------------+
             |                                                                         |
             v                                                                         v
+-------------------+                   +-------------------+                 +-------------------+
|    (m:Movie)      | <--[:DIRECTED]--- |    (p:Person)     |                 |   (t:Theater)     |
| id, title, rating | <--[:ACTED_IN]--- | id, name, role    |                 | id, name, location|
+---------+---------+                   +-------------------+                 +-------------------+
          |
          | [:IN_GENRE]
          v
+-------------------+
|    (g:Genre)      |
| id, name          |


-->What does this app do?

1.Friend Recommendations: When you select your profile, the app looks at what movies your friends have booked and recommends them to you.
2.Interactive Seat Picker: Select your cinema theater, showtime, and seats. You can even see which exact seats your friends have booked!
3.Food & Snacks: Add popcorn and drinks to your booking.
4.Digital Ticket Pass: Generates an instant ticket pass with a QR code.
5.2D Knowledge Graph Visualizer: Inspect the complete database connections (Movies, Actors, Directors, Theaters, Showtimes, Viewers) in an interactive graph visualizer.



-->Why use a Graph Database (Neo4j / CognoDB)?

In a normal SQL database, finding what movies your friends of friends booked requires writing complex and slow `JOIN` queries.

In a Graph Database:
- Users, Movies, and Showtimes are connected like a social network map.
- Finding 1st-degree and 2nd-degree friend bookings is instant and super fast because the database simply follows the connections (relationships) directly!



--> Graph Database Structure (Data Model)



    User1[User: Arjun] -->|FRIEND_WITH| User2[User: Priya Sharma]
    User2 -->|FRIEND_WITH| User4[User: Ananya Roy]

    User2 -->|BOOKED seat C4| Showtime1[Showtime: 06:00 PM IST]
    User4 -->|BOOKED seat C5| Showtime1

    Showtime1 -->|SHOWS_MOVIE| Movie1[Movie: Oppenheimer]
    Showtime1 -->|AT_THEATER| Theater1[Theater: PVR Directors Cut]
    Showtime1 -->|HAS_SEAT_TYPE| SeatType1[SeatType: Executive Premium]

    Movie1 -->|IN_GENRE| Genre1[Genre: Drama]
    Person1[Person: Christopher Nolan] -->|DIRECTED| Movie1
    Person2[Person: Cillian Murphy] -->|ACTED_IN| Movie1




->How to Run the Project (Step by Step)

Prerequisites
Make sure you have installed:
-Node.js (v18 or higher)
-Neo4j Desktop CognoDB



Step 1: Open Terminal & Navigate to Project

cd cinematch-movie-app




Step 2: Setup Backend Server

1. Go into the `Backend` directory and install dependencies:

   cd Backend
   npm install


2. Create a `.env` file inside `Backend` directory with your database details:
   env
   PORT=5000
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your_password


3. Seed the database (creates users, movies, theaters, showtimes, and friend bookings):

   npm run seed


4. Start the backend server:

   npm run dev

   Backend will start on `http://localhost:5000`


Step 3: Setup Frontend App

1. Open a new terminal and go to the frontend directory:

   cd client/cinematch-frontend
   npm install


2. Start the frontend app:

   npm run dev




