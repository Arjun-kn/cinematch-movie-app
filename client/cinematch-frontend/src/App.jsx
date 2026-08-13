import React, { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import MovieCard from './components/MovieCard';
import GraphVisualizer from './components/GraphVisualizer';
import SeatPicker from './components/SeatPicker';
import MyBookingsModal from './components/MyBookingsModal';
import { fetchUsers, fetchAllMovies } from './services/api';
import { Sparkles, AlertTriangle, Ticket, Film, Loader2 } from 'lucide-react';

export default function App() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [movies, setMovies] = useState([]);
  
  const [selectedGraphMovie, setSelectedGraphMovie] = useState(null);
  const [selectedBookingMovie, setSelectedBookingMovie] = useState(null);
  const [showMyBookings, setShowMyBookings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);

  // Load registered users on initial mount
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await fetchUsers();
        const userData = res.data?.data;
        if (userData && userData.length > 0) {
          setUsers(userData);
          setCurrentUser(userData[0]);
          setDbError(false);
        } else {
          setUsers([]);
        }
      } catch (error) {
        console.error("Failed to load users:", error);
        setDbError(true);
      } finally {
        setLoading(false);
      }
    };
  
    loadUsers();
  }, []);

  useEffect(() => {
    const loadMovies = async () => {
      if (!currentUser?.id) return;
      setLoading(true);
      try {
        const res = await fetchAllMovies(currentUser.id);
        if (res.data?.data) {
          setMovies(res.data.data);
          setDbError(false);
        } else {
          setMovies([]);
        }
      } catch (err) {
        console.error("Failed to fetch movies:", err);
        setMovies([]);
        setDbError(true);
      } finally {
        setLoading(false);
      }
    };

    loadMovies();
  }, [currentUser]);


  const handleBookingSuccess = async () => {
    if (!currentUser?.id) return;
    try {
      const res = await fetchAllMovies(currentUser.id);
      if (res.data?.data) {
        setMovies(res.data.data);
      }
    } catch (err) {
      console.error('Failed to refresh movies after booking:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12 font-sans">
      <Navbar 
        users={users} 
        currentUser={currentUser} 
        onSelectUser={setCurrentUser} 
        onOpenBookings={() => setShowMyBookings(true)}
      />

      {/* Database Error Banner */}
      {dbError && (
        <div className="bg-indigo-950/60 border-b border-indigo-800/50 px-6 py-2.5 flex items-center justify-between gap-2 text-indigo-200 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Backend database API is waking up or unreachable. Please refresh after 30 seconds if using Render free tier.</span>
          </div>
          <span className="bg-red-900/80 px-2 py-0.5 rounded text-[10px] font-mono text-red-300">API Offline</span>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 mt-8">
        {/* Banner Section */}
        <div className="bg-gradient-to-r from-indigo-900/60 via-slate-900 to-purple-950/50 border border-indigo-800/50 rounded-2xl p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" /> Multi-Hop Graph Recommendations & Dynamic Seat Layout
            </div>
            <h2 className="text-2xl font-black text-white">Book Seats Recommended by Friends of {currentUser?.name || 'User'}</h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Book movie tickets with real-time seat availability, social graph insights, and cinema snacks.
            </p>
          </div>

          <button
            onClick={() => setShowMyBookings(true)}
            className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/30"
          >
            <Ticket className="w-4 h-4" />
            <span>View My Tickets</span>
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Film className="w-5 h-5 text-indigo-400" /> Now Showing in Cinemas ({movies.length})
          </h3>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <span className="text-sm font-semibold">Loading movie recommendations...</span>
          </div>
        ) : movies.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
            <Film className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <h4 className="text-base font-bold text-white mb-1">No Movies Found</h4>
            <p className="text-xs">Make sure your backend server is running and database is seeded.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {movies.map(movie => (
              <MovieCard 
                key={movie.id} 
                movie={movie} 
                onSelect={() => setSelectedBookingMovie(movie)}
                onInspectGraph={setSelectedGraphMovie}
              />
            ))}
          </div>
        )}
      </main>

    
      {selectedBookingMovie && (
        <SeatPicker
          movie={selectedBookingMovie}
          currentUser={currentUser}
          onClose={() => setSelectedBookingMovie(null)}
          onBookingSuccess={handleBookingSuccess}
        />
      )}

     
      {showMyBookings && (
        <MyBookingsModal
          currentUser={currentUser}
          onClose={() => setShowMyBookings(false)}
        />
      )}

      
      {selectedGraphMovie && (
        <GraphVisualizer 
          movie={selectedGraphMovie} 
          onClose={() => setSelectedGraphMovie(null)} 
        />
      )}
    </div>
  );
}