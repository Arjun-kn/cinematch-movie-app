import React, { useEffect, useState } from 'react';
import { X, Ticket, Calendar, Clock, MapPin, QrCode, CheckCircle2, Film } from 'lucide-react';
import { fetchUserBookings } from '../services/api';

export default function MyBookingsModal({ currentUser, onClose }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);

  useEffect(() => {
    const loadBookings = async () => {
      if (!currentUser?.id) return;
      setLoading(true);
      try {
        const res = await fetchUserBookings(currentUser.id);
        if (res.data?.data) {
          setBookings(res.data.data);
          if (res.data.data.length > 0) {
            setSelectedTicket(res.data.data[0]);
          } else {
            setSelectedTicket(null);
          }
        }
      } catch (err) {
        console.error("Failed to load user bookings from backend DB:", err);
        setBookings([]);
        setSelectedTicket(null);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, [currentUser]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Today';
    try {
      const d = new Date(dateString);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      }
    } catch {}
    return dateString;
  };

  const formatTime = (timeString) => {
    if (!timeString) return '06:00 PM (IST)';
    if (timeString.includes('AM') || timeString.includes('PM')) {
      return timeString.includes('IST') ? timeString : `${timeString} (IST)`;
    }
    try {
      const d = new Date(timeString);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) + ' (IST)';
      }
    } catch {}
    return `${timeString} (IST)`;
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
        
        {/* Header Bar */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">My Movie Tickets</h2>
              <p className="text-xs text-slate-400">Bookings for {currentUser?.name || 'User'}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Viewport */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
              Fetching your tickets from backend database...
            </div>
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Film className="w-12 h-12 text-slate-600 mb-3" />
              <h3 className="text-base font-semibold text-slate-300">No Tickets Booked Yet</h3>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Select a movie on the main screen to book your seats!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Tickets List */}
              <div className="lg:col-span-5 flex flex-col gap-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Your Booked Shows ({bookings.length})</span>
                {bookings.map((t) => (
                  <button
                    key={t.bookingId}
                    onClick={() => setSelectedTicket(t)}
                    className={`text-left p-3.5 rounded-xl border transition-all flex gap-3.5 items-center ${
                      selectedTicket?.bookingId === t.bookingId
                        ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-lg ring-1 ring-indigo-500/40'
                        : 'bg-slate-800/60 border-slate-700/70 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <img 
                      src={t.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=150'} 
                      alt={t.movieTitle} 
                      className="w-12 h-16 object-cover rounded-lg shrink-0 border border-slate-700"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-white truncate">{t.movieTitle}</h4>
                      <p className="text-xs text-indigo-400 font-medium truncate mt-0.5">{t.theaterName}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                        <span className="bg-slate-700/60 px-1.5 py-0.5 rounded text-slate-200 font-mono">
                          Seats: {t.seats ? t.seats.join(', ') : t.seatNo}
                        </span>
                        <span>₹{t.totalAmount || 450}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Right Column: Digital Ticket Pass Card */}
              {selectedTicket && (
                <div className="lg:col-span-7 flex flex-col items-center">
                  <div className="w-full max-w-sm bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl relative">
                    
                    {/* Header */}
                    <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white">
                      <div>
                        <div className="text-[10px] uppercase font-bold tracking-widest text-indigo-200">Digital Pass</div>
                        <div className="text-base font-extrabold">{selectedTicket.movieTitle}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold tracking-widest text-indigo-200">Ref ID</div>
                        <div className="text-xs font-mono font-bold">{selectedTicket.bookingId}</div>
                      </div>
                    </div>

                    {/* Movie Banner & Info */}
                    <div className="p-5 flex flex-col gap-4">
                      <div className="flex gap-4 items-center">
                        <img 
                          src={selectedTicket.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300'} 
                          alt={selectedTicket.movieTitle} 
                          className="w-20 h-28 object-cover rounded-xl border border-slate-700 shadow-md"
                        />
                        <div className="flex flex-col gap-1.5 text-xs">
                          <div className="flex items-center gap-2 text-slate-300">
                            <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span className="font-medium text-white">{selectedTicket.theaterName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-300">
                            <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span>{formatDate(selectedTicket.bookedAt || selectedTicket.showtime)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-300">
                            <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span>{formatTime(selectedTicket.time || selectedTicket.showtime)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-emerald-400 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Confirmed • Paid via {selectedTicket.paymentMethod || 'UPI'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Ticket Tear Line */}
                      <div className="relative my-2 flex items-center justify-center">
                        <div className="w-full border-t-2 border-dashed border-slate-700"></div>
                        <div className="absolute -left-8 w-6 h-6 bg-slate-900 rounded-full border-r border-slate-700"></div>
                        <div className="absolute -right-8 w-6 h-6 bg-slate-900 rounded-full border-l border-slate-700"></div>
                      </div>

                      {/* Seats & Price Breakdown */}
                      <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-center">
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Seat Number(s)</div>
                          <div className="text-lg font-black text-indigo-400 font-mono mt-0.5">
                            {selectedTicket.seats ? selectedTicket.seats.join(', ') : selectedTicket.seatNo}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Paid</div>
                          <div className="text-lg font-black text-white font-mono mt-0.5">
                            ₹{selectedTicket.totalAmount || 450}
                          </div>
                        </div>
                      </div>

                      {/* QR Code Section */}
                      <div className="flex flex-col items-center justify-center bg-white p-4 rounded-2xl text-slate-900 gap-2 shadow-inner">
                        <QrCode className="w-28 h-28 text-slate-900" />
                        <span className="text-[10px] font-mono font-bold tracking-wider text-slate-600">
                          SCAN AT CINEMA GATE • {selectedTicket.bookingId}
                        </span>
                      </div>

                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
