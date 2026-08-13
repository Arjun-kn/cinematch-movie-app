import { Star, Users, Network, Ticket, UserCheck, UserPlus } from 'lucide-react';

export default function MovieCard({ movie, onSelect, onInspectGraph }) {
  const directFriends = movie.directFriends || [];
  const friendOfFriends = movie.friendOfFriends || [];
  const hasSocialGraphInfo = directFriends.length > 0 || friendOfFriends.length > 0 || (movie.recommendedBy && movie.recommendedBy.length > 0);

  return (
    <div className="bg-slate-900/90 rounded-xl overflow-hidden border border-slate-800 hover:border-indigo-500 transition-all flex flex-col justify-between group shadow-lg">
      <div className="cursor-pointer" onClick={() => onSelect(movie)}>
        <div className="relative aspect-[3/4] overflow-hidden">
          <img 
            src={movie.posterUrl} 
            alt={movie.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md text-amber-400 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-semibold border border-slate-700">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            {movie.rating}
          </div>
        </div>

        <div className="p-4">
          <h3 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">{movie.title}</h3>
          

          {hasSocialGraphInfo && (
            <div className="flex flex-col gap-1.5 mb-3">
              {directFriends.length > 0 && (
                <div className="bg-emerald-950/70 border border-emerald-800/60 rounded-lg p-2 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="text-xs text-emerald-200">
                    Booked by Direct Friend: <span className="font-semibold text-white">{directFriends.join(', ')}</span>
                  </p>
                </div>
              )}

              {friendOfFriends.length > 0 && (
                <div className="bg-purple-950/70 border border-purple-800/60 rounded-lg p-2 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-purple-400 shrink-0" />
                  <p className="text-xs text-purple-200">
                    Booked by 2nd-Degree Friend: <span className="font-semibold text-white">{friendOfFriends.join(', ')}</span>
                  </p>
                </div>
              )}

              {directFriends.length === 0 && friendOfFriends.length === 0 && movie.recommendedBy && (
                <div className="bg-indigo-950/70 border border-indigo-800/60 rounded-lg p-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400 shrink-0" />
                  <p className="text-xs text-indigo-200">
                    Booked by <span className="font-semibold text-white">{movie.recommendedBy.join(', ')}</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 pt-0 flex gap-2">
        <button 
          onClick={() => onSelect(movie)}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30"
        >
          <Ticket className="w-4 h-4" />
          <span>Book Seats</span>
        </button>
        <button 
          onClick={() => onInspectGraph(movie)}
          title="Inspect Node Relationships in Knowledge Graph"
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
        >
          <Network className="w-5 h-5 text-indigo-400" />
        </button>
      </div>
    </div>
  );
}