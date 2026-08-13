import { useState, useEffect, useMemo } from 'react';
import { 
  X, CheckCircle, Ticket, Popcorn, CreditCard, 
  Sparkles, Calendar, Clock, ChevronRight, ArrowLeft, QrCode,
  MapPin, Coffee, Info, UserCheck, UserPlus
} from 'lucide-react';
import { bookTicket, fetchShowtimeSeats, fetchMovieShowtimes } from '../services/api';

const SNACK_OPTIONS = [
  { id: 'sn1', name: 'Popcorn Combo (Large + Pepsi)', price: 290, desc: 'Large Salted Popcorn + 750ml Pepsi', icon: Popcorn },
  { id: 'sn2', name: 'Cheese Nachos & Dip', price: 220, desc: 'Crispy Tortilla Chips with Warm Cheese Dip', icon: Coffee },
  { id: 'sn3', name: 'Fountain Coke (750ml)', price: 150, desc: 'Chilled Aerated Beverage', icon: Coffee },
  { id: 'sn4', name: 'Caramel & Salted Mixed Popcorn', price: 250, desc: 'Gourmet Dual Flavor XL Tub', icon: Popcorn },
];


export const formatShowtimeTime = (timeStr) => {
  if (!timeStr) return '';
  if (timeStr.includes('AM') || timeStr.includes('PM')) {
    if (!timeStr.includes('IST') && !timeStr.includes('UTC')) {
      return `${timeStr} (IST)`;
    }
    return timeStr;
  }
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    const padHour = String(hour12).padStart(2, '0');
    return `${padHour}:${String(m).padStart(2, '0')} ${period} (IST)`;
  }
  try {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      const timeFormatted = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      return `${timeFormatted} (IST)`;
    }
  } catch (e) {}
  return `${timeStr} (IST)`;
};

// Helper to safely convert Neo4j Integer objects { low, high } into primitive numbers
const toNum = (val, fallback = 0) => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && 'low' in val && typeof val.low === 'number') return val.low;
  const p = Number(val);
  return isNaN(p) ? fallback : p;
};

// Helper to determine dynamic row tier based on total rows count
const getRowTierInfo = (rowChar, totalNumRows) => {
  const rowIndex = rowChar.charCodeAt(0) - 65; // A -> 0, B -> 1, C -> 2...
  const vipRowsCount = Math.max(1, Math.floor(totalNumRows * 0.25)); // Top ~25% rows
  const execRowsCount = Math.max(1, Math.floor(totalNumRows * 0.5)); // Middle ~50% rows

  if (rowIndex < vipRowsCount) {
    return { name: 'VIP Recliner', basePrice: 650, headerBg: 'text-amber-400 border-amber-500/40 bg-amber-950/20' };
  } else if (rowIndex < vipRowsCount + execRowsCount) {
    return { name: 'Executive Premium', basePrice: 450, headerBg: 'text-indigo-400 border-indigo-500/40 bg-indigo-950/20' };
  } else {
    return { name: 'Standard Club', basePrice: 300, headerBg: 'text-slate-400 border-slate-700 bg-slate-900/40' };
  }
};

export default function SeatPicker({ movie, currentUser, onClose, onBookingSuccess }) {
  const [showtimesList, setShowtimesList] = useState([]);
  const [selectedTheater, setSelectedTheater] = useState(null);
  const [selectedShowtime, setSelectedShowtime] = useState(null);
  const [selectedDate, setSelectedDate] = useState('Today');
  
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [snackQuantities, setSnackQuantities] = useState({});
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  
  const [step, setStep] = useState(1); // 1: Cinema & Seats, 2: Food, 3: Checkout, 4: Digital Pass
  const [isBooking, setIsBooking] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [isLoadingShowtimes, setIsLoadingShowtimes] = useState(true);

 
  const [bookedSeatsData, setBookedSeatsData] = useState({});


  useEffect(() => {
    let isMounted = true;

    const loadShowtimes = async () => {
      setIsLoadingShowtimes(true);
      try {
        const res = await fetchMovieShowtimes(movie.id, currentUser?.id);
        if (isMounted) {
          const fetchedShowtimes = res.data?.data;
          if (fetchedShowtimes && fetchedShowtimes.length > 0) {
            setShowtimesList(fetchedShowtimes);
            
        
            const theaterWithFriends = fetchedShowtimes.find(st => st.friendBookings && st.friendBookings.length > 0)?.theater;
            const defaultTheater = theaterWithFriends || fetchedShowtimes[0].theater;
            
            setSelectedTheater(defaultTheater);
            const firstShowtime = fetchedShowtimes.find(st => st.theater.id === defaultTheater.id) || fetchedShowtimes[0];
            setSelectedShowtime(firstShowtime);
          } else {
            setShowtimesList([]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch dynamic showtimes from backend DB:", err);
        if (isMounted) setShowtimesList([]);
      } finally {
        if (isMounted) setIsLoadingShowtimes(false);
      }
    };

    loadShowtimes();

    return () => { isMounted = false; };
  }, [movie.id, currentUser]);

 
  const totalSeatsCount = toNum(selectedShowtime?.totalSeats, 70);
  const seatsPerRow = 10;
  const numRows = Math.max(1, Math.ceil(totalSeatsCount / seatsPerRow));
  
  const dynamicRows = useMemo(() => {
    return Array.from({ length: numRows }, (_, i) => String.fromCharCode(65 + i)); 
  }, [numRows]);

 
  const availableTheaters = useMemo(() => {
    const map = new Map();
    showtimesList.forEach(st => {
      if (st.theater && !map.has(st.theater.id)) {
        const theaterShowtimes = showtimesList.filter(s => s.theater.id === st.theater.id);
        const friendBookings = theaterShowtimes.flatMap(s => s.friendBookings || []);
        const directFriends = Array.from(new Set(friendBookings.filter(b => b.isDirectFriend || b.relationType === 'FRIEND').map(b => b.userName)));
        const fofFriends = Array.from(new Set(friendBookings.filter(b => b.isFriendOfFriend || b.relationType === 'FRIEND_OF_FRIEND').map(b => b.userName)));
        
        map.set(st.theater.id, {
          ...st.theater,
          directFriends,
          fofFriends,
          hasFriends: directFriends.length > 0 || fofFriends.length > 0
        });
      }
    });
    return Array.from(map.values());
  }, [showtimesList]);

  const dynamicDateTabs = useMemo(() => {
    const today = new Date();
    const todayStr = `Today (${today.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })})`;
    
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = `Tomorrow (${tomorrow.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })})`;

    const tabs = [
      { id: 'Today', label: todayStr },
      { id: 'Tomorrow', label: tomorrowStr }
    ];

    const friendBookingMap = new Map();
    showtimesList.forEach(st => {
      (st.allBookings || []).forEach(b => {
        if (b.bookedAt) {
          try {
            const d = new Date(b.bookedAt);
            if (!isNaN(d.getTime())) {
              const formattedDate = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
              if (!friendBookingMap.has(formattedDate)) {
                friendBookingMap.set(formattedDate, {
                  dateStr: formattedDate,
                  userNames: [b.userName],
                  isDirect: b.relationType === 'FRIEND'
                });
              } else {
                const existing = friendBookingMap.get(formattedDate);
                if (!existing.userNames.includes(b.userName)) {
                  existing.userNames.push(b.userName);
                }
              }
            }
          } catch (e) {
            console.error("Failed to parse friend booking date:", e);
          }
        }
      });
    });

    friendBookingMap.forEach((info) => {
      tabs.push({
        id: info.dateStr,
        label: `${info.dateStr} (${info.userNames.join(', ')})`,
        isFriendDate: true,
        userNames: info.userNames,
        isDirect: info.isDirect
      });
    });

    return tabs;
  }, [showtimesList]);


  const showtimesForSelectedTheater = useMemo(() => {
    if (!selectedTheater) return [];
    return showtimesList.filter(st => st.theater.id === selectedTheater.id);
  }, [showtimesList, selectedTheater]);

  
  useEffect(() => {
    const loadSeats = async () => {
      if (!selectedShowtime?.id) return;
      setSelectedSeats([]); 
      
      try {
        const res = await fetchShowtimeSeats(selectedShowtime.id, currentUser?.id);
        if (res.data?.data) {
          setBookedSeatsData(res.data.data);
        } else {
          setBookedSeatsData({});
        }
      } catch (err) {
        console.error("Failed to fetch seat layout from backend DB:", err);
        setBookedSeatsData({});
      }
    };

    loadSeats();
  }, [selectedShowtime, currentUser]);

  const handleTheaterSelect = (theater) => {
    setSelectedTheater(theater);
    const firstSt = showtimesList.find(st => st.theater.id === theater.id);
    if (firstSt) {
      setSelectedShowtime(firstSt);
    }
  };


  const handleSeatClick = (seatId) => {
    if (bookedSeatsData[seatId]) return;
    setSelectedSeats(prev => 
      prev.includes(seatId) 
        ? prev.filter(s => s !== seatId) 
        : [...prev, seatId]
    );
  };

  // Quick seat quantity auto-picker
  const handleQuickQuantity = (qty) => {
    const available = [];
    for (const r of dynamicRows) {
      for (let i = 1; i <= seatsPerRow; i++) {
        const id = `${r}${i}`;
        const seatIndex = (r.charCodeAt(0) - 65) * seatsPerRow + (i - 1);
        if (seatIndex < totalSeatsCount && !bookedSeatsData[id] && !available.includes(id)) {
          available.push(id);
          if (available.length === qty) break;
        }
      }
      if (available.length === qty) break;
    }
    setSelectedSeats(available);
  };

  const handleSnackChange = (snackId, delta) => {
    setSnackQuantities(prev => {
      const current = prev[snackId] || 0;
      const updated = Math.max(0, current + delta);
      return { ...prev, [snackId]: updated };
    });
  };

  // Pricing calculation helpers
  const seatSubtotal = selectedSeats.reduce((sum, seatId) => {
    const row = seatId.charAt(0);
    const tier = getRowTierInfo(row, numRows);
    const price = selectedShowtime?.basePrice 
      ? Math.round(tier.basePrice * (toNum(selectedShowtime.basePrice, 450) / 450)) 
      : tier.basePrice;
    return sum + price;
  }, 0);

  const snacksSubtotal = Object.entries(snackQuantities).reduce((sum, [sId, qty]) => {
    const snack = SNACK_OPTIONS.find(s => s.id === sId);
    return sum + (snack ? snack.price * qty : 0);
  }, 0);

  const convenienceFee = selectedSeats.length > 0 ? selectedSeats.length * 30 : 0;
  const taxes = Math.round((seatSubtotal + convenienceFee) * 0.18);
  const grandTotal = seatSubtotal + snacksSubtotal + convenienceFee + taxes;

  const handleConfirmBooking = async () => {
    if (selectedSeats.length === 0 || !selectedShowtime) return;

    setIsBooking(true);
    const bookingPayload = {
      userId: currentUser.id,
      showtimeId: selectedShowtime.id,
      seatNos: selectedSeats,
      totalAmount: grandTotal,
      snacks: Object.entries(snackQuantities).filter(([_, qty]) => qty > 0).map(([id, qty]) => ({ id, qty })),
      paymentMethod
    };

    try {
      const res = await bookTicket(bookingPayload);
      if (res.data?.data) {
        setConfirmedBooking(res.data.data);
        setStep(4);
        onBookingSuccess();
      }
    } catch (error) {
      console.error('Failed to process booking on backend DB:', error);
      alert('Booking failed! Please make sure backend database server is running.');
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4">
    
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl h-[94vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
        
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-slate-800/95 border-b border-slate-700 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            {step > 1 && step < 4 && (
              <button 
                onClick={() => setStep(prev => prev - 1)} 
                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-white">{movie.title}</h2>
                {selectedShowtime?.format && (
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                    {selectedShowtime.format}
                  </span>
                )}
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
                  {totalSeatsCount} Capacity
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {selectedTheater?.name || 'Selecting Cinema...'} ({selectedTheater?.location || selectedTheater?.city}) • {selectedDate}, {formatShowtimeTime(selectedShowtime?.time) || '--:--'}
              </p>
            </div>
          </div>

   
          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold">
            <span className={`px-3 py-1 rounded-full ${step === 1 ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-400'}`}>1. Seats & Screen</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className={`px-3 py-1 rounded-full ${step === 2 ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-400'}`}>2. Snacks</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className={`px-3 py-1 rounded-full ${step === 3 ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-400'}`}>3. Checkout</span>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

      
        {step === 1 && (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/70">
            
            {/* Streamlined Cinema Theater & Showtime Selection Header Strip (Compact & Space-saving) */}
            <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
              
              {/* Theater Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                <span className="text-xs font-bold text-slate-400 shrink-0 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400" /> Cinema:
                </span>
                {availableTheaters.map(theater => {
                  const isSelected = selectedTheater?.id === theater.id;
                  const hasDirect = theater.directFriends.length > 0;
                  const hasFoF = theater.fofFriends.length > 0;

                  return (
                    <button
                      key={theater.id}
                      onClick={() => handleTheaterSelect(theater)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all shrink-0 flex items-center gap-2 ${
                        isSelected 
                          ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/30' 
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span>{theater.name}</span>
                      {hasDirect && (
                        <span className="bg-emerald-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-full" title={`Friend: ${theater.directFriends.join(', ')}`}>
                          Friend
                        </span>
                      )}
                      {!hasDirect && hasFoF && (
                        <span className="bg-purple-400 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-full" title={`2nd-Degree: ${theater.fofFriends.join(', ')}`}>
                          2nd-Deg
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 overflow-x-auto py-1">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  {dynamicDateTabs.map(tab => {
                    const isSelected = selectedDate === tab.id;

                    return (
                      <button
                        key={tab.id}
                        onClick={() => setSelectedDate(tab.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all shrink-0 flex items-center gap-1.5 ${
                          isSelected 
                            ? 'bg-indigo-600 border-indigo-400 text-white shadow-md' 
                            : tab.isFriendDate
                              ? 'bg-emerald-950/80 border-emerald-600/80 text-emerald-300 hover:bg-emerald-900'
                              : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span>{tab.label}</span>
                        {tab.isFriendDate && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  {showtimesForSelectedTheater.map(st => {
                    const isSelected = selectedShowtime?.id === st.id;
                    const hasDirect = st.directFriendBookings && st.directFriendBookings.length > 0;
                    const hasFoF = st.fofBookings && st.fofBookings.length > 0;

                    return (
                      <button
                        key={st.id}
                        onClick={() => setSelectedShowtime(st)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 shrink-0 ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/30'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <span>{formatShowtimeTime(st.time)}</span>
                        <span className="text-[10px] opacity-75">({st.format})</span>
                        {hasDirect && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                        {!hasDirect && hasFoF && <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

     
            <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-8 flex flex-col items-center gap-6 justify-start">
              
             
              <div className="w-full max-w-2xl bg-slate-900/80 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between gap-4 shrink-0 shadow-md">
                <span className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-indigo-400" /> Auto Select Seats:
                </span>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6].map(num => (
                    <button
                      key={num}
                      onClick={() => handleQuickQuantity(num)}
                      className={`w-8 h-8 rounded-lg font-bold border transition-all text-xs flex items-center justify-center ${
                        selectedSeats.length === num
                          ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

            
              <div className="w-full max-w-3xl flex flex-col items-center gap-2 my-2 shrink-0">
                <div className="w-11/12 h-4 bg-gradient-to-b from-indigo-500/50 via-indigo-600/20 to-transparent rounded-t-full border-t-4 border-indigo-400 shadow-[0_-15px_30px_rgba(99,102,241,0.5)]"></div>
                <span className="text-[11px] text-indigo-300 uppercase tracking-widest font-black flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> CURVED CINEMA IMAX SCREEN • {totalSeatsCount} SEATS
                </span>
              </div>

              {/* PROMINENT DYNAMIC SEAT GRID */}
              <div className="flex flex-col gap-4 items-center py-4 px-2 w-full max-w-4xl">
                {dynamicRows.map((row, rowIndex) => {
                  const tier = getRowTierInfo(row, numRows);
                  const displayPrice = selectedShowtime?.basePrice 
                    ? Math.round(tier.basePrice * (toNum(selectedShowtime.basePrice, 450) / 450)) 
                    : tier.basePrice;

                  // Check if this row is the first of a new tier to render a tier category header
                  const prevTier = rowIndex > 0 ? getRowTierInfo(dynamicRows[rowIndex - 1], numRows) : null;
                  const showTierHeader = rowIndex === 0 || prevTier.name !== tier.name;

                  // Seats in this row
                  const rowStartSeatIndex = rowIndex * seatsPerRow;
                  const remainingSeats = Math.max(0, totalSeatsCount - rowStartSeatIndex);
                  const numSeatsInThisRow = Math.min(seatsPerRow, remainingSeats);
                  
                  const leftBlockCount = Math.min(5, numSeatsInThisRow);
                  const rightBlockCount = Math.max(0, numSeatsInThisRow - 5);

                  return (
                    <div key={row} className="flex flex-col gap-1.5 items-center w-full">
                      {showTierHeader && (
                        <div className={`w-full max-w-xl text-center text-xs uppercase font-extrabold tracking-wider py-1 rounded-lg border mb-1.5 ${tier.headerBg}`}>
                          {tier.name} — ₹{displayPrice}
                        </div>
                      )}

                      <div className="flex gap-4 items-center justify-center">
                        <span className="text-xs text-slate-500 font-extrabold w-5 text-right font-mono">{row}</span>
                        
                        {/* Left Block (Seats 1-5) */}
                        <div className="flex gap-2 sm:gap-2.5">
                          {Array.from({ length: leftBlockCount }, (_, i) => {
                            const seatId = `${row}${i + 1}`;
                            return renderSeatButton(seatId, displayPrice);
                          })}
                        </div>

                        {/* Center Aisle Gap */}
                        {rightBlockCount > 0 && (
                          <div className="w-6 sm:w-10 text-[10px] text-slate-600 text-center font-extrabold tracking-widest font-mono">AISLE</div>
                        )}

                        {/* Right Block (Seats 6-10) */}
                        <div className="flex gap-2 sm:gap-2.5">
                          {Array.from({ length: rightBlockCount }, (_, i) => {
                            const seatId = `${row}${i + 6}`;
                            return renderSeatButton(seatId, displayPrice);
                          })}
                        </div>

                        <span className="text-xs text-slate-500 font-extrabold w-5 text-left font-mono">{row}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

          
              <div className="w-full max-w-3xl flex flex-wrap justify-center gap-6 text-xs text-slate-300 pt-4 border-t border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-md bg-slate-800 border border-slate-600"></div>
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-md bg-indigo-600 border border-indigo-400 shadow-sm shadow-indigo-500"></div>
                  <span className="text-white font-bold">Your Selected Seat</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-md bg-emerald-950 border border-emerald-500"></div>
                  <span className="text-emerald-300 flex items-center gap-1 font-bold">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> Direct Friend (1-Hop)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-md bg-purple-950 border border-purple-500"></div>
                  <span className="text-purple-300 flex items-center gap-1 font-bold">
                    <UserPlus className="w-3.5 h-3.5 text-purple-400" /> 2nd-Degree Friend (2-Hop)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-md bg-slate-950 border border-slate-850 opacity-60"></div>
                  <span>Occupied</span>
                </div>
              </div>

            </div>

           
            {selectedSeats.length > 0 && (
              <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 border-t border-indigo-800/80 px-6 py-4 flex justify-between items-center shrink-0 shadow-2xl">
                <div>
                  <div className="flex items-center gap-2 text-indigo-300 text-sm font-semibold">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span>Selected ({selectedSeats.length} {selectedSeats.length === 1 ? 'Seat' : 'Seats'}):</span>
                    <strong className="text-white font-mono text-lg">{selectedSeats.join(', ')}</strong>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Tickets subtotal: ₹{seatSubtotal}</p>
                </div>
                <button
                  onClick={() => setStep(2)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition-all text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/40"
                >
                  <span>Proceed to F&B Snacks</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>
        )}

 
        {step === 2 && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Popcorn className="w-5 h-5 text-amber-400" /> Grab Movie Snacks & Combos
                </h3>
                <p className="text-xs text-slate-400">Pre-book food & drinks at discounted cinema prices!</p>
              </div>
              <button 
                onClick={() => setStep(3)} 
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                Skip to Checkout &rarr;
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SNACK_OPTIONS.map(snack => {
                const qty = snackQuantities[snack.id] || 0;
                return (
                  <div key={snack.id} className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 flex justify-between items-center gap-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-white">{snack.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{snack.desc}</p>
                      <span className="text-sm font-extrabold text-amber-400 mt-2 block">₹{snack.price}</span>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg p-1">
                      <button
                        onClick={() => handleSnackChange(snack.id, -1)}
                        className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-colors"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-sm font-mono font-bold text-white">{qty}</span>
                      <button
                        onClick={() => handleSnackChange(snack.id, 1)}
                        className="w-7 h-7 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

           
            <div className="mt-auto pt-4 border-t border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-xs text-slate-400 block">Current Total</span>
                <span className="text-lg font-black text-white">₹{seatSubtotal + snacksSubtotal}</span>
              </div>
              <button
                onClick={() => setStep(3)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition-all text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30"
              >
                <span>Continue to Payment</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      
        {step === 3 && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6">
            <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-400" /> Booking Summary & Payment
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Itemized Price Breakdown */}
              <div className="md:col-span-7 bg-slate-950/80 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bill Details</span>
                
                <div className="flex justify-between text-sm text-slate-300">
                  <span>Seats ({selectedSeats.join(', ')})</span>
                  <span className="font-mono font-semibold">₹{seatSubtotal}</span>
                </div>

                {snacksSubtotal > 0 && (
                  <div className="flex justify-between text-sm text-slate-300">
                    <span>Food & Beverages</span>
                    <span className="font-mono font-semibold">₹{snacksSubtotal}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm text-slate-400">
                  <span>Convenience Fee (₹30 × {selectedSeats.length})</span>
                  <span className="font-mono">₹{convenienceFee}</span>
                </div>

                <div className="flex justify-between text-sm text-slate-400">
                  <span>Integrated GST (18%)</span>
                  <span className="font-mono">₹{taxes}</span>
                </div>

                <div className="border-t border-slate-800 pt-3 mt-1 flex justify-between items-center text-white">
                  <span className="font-bold text-base">Grand Total</span>
                  <span className="font-black text-xl text-indigo-400 font-mono">₹{grandTotal}</span>
                </div>
              </div>

            
              <div className="md:col-span-5 flex flex-col gap-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Payment Method</span>
                
                {[
                  { id: 'UPI', name: 'UPI (GPay / PhonePe / Paytm)', icon: Sparkles },
                  { id: 'Card', name: 'Credit / Debit Card', icon: CreditCard },
                  { id: 'Counter', name: 'Pay at Cinema Counter', icon: Ticket },
                ].map(method => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                      paymentMethod === method.id
                        ? 'bg-indigo-950/60 border-indigo-500 text-white ring-1 ring-indigo-500'
                        : 'bg-slate-800/40 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <method.icon className="w-5 h-5 text-indigo-400 shrink-0" />
                    <span className="text-xs font-bold">{method.name}</span>
                  </button>
                ))}

                <button
                  disabled={isBooking}
                  onClick={handleConfirmBooking}
                  className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-extrabold py-3.5 rounded-xl transition-all text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                >
                  {isBooking ? 'Securing Seats in CognoDB...' : `Pay ₹${grandTotal} & Confirm Booking`}
                </button>
              </div>

            </div>
          </div>
        )}

    
        {step === 4 && confirmedBooking && (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
            
            <div className="w-full max-w-md bg-gradient-to-b from-indigo-950/90 to-slate-900 border border-indigo-500/50 rounded-3xl p-6 flex flex-col gap-5 shadow-2xl relative text-center">
              
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                <CheckCircle className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-xl font-black text-white">Booking Confirmed!</h3>
                <p className="text-xs text-indigo-300 mt-1">Ticket record generated in CognoDB graph database</p>
              </div>

              {/* Ticket Card Details */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-xs text-slate-400 font-mono">ID: {confirmedBooking.bookingId}</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">VERIFIED</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block">Movie</span>
                    <strong className="text-white text-sm">{confirmedBooking.movieTitle}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Seats</span>
                    <strong className="text-indigo-400 text-sm font-mono">{confirmedBooking.seatNo}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Theater</span>
                    <span className="text-slate-200">{confirmedBooking.theaterName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Time</span>
                    <span className="text-slate-200">{confirmedBooking.time}</span>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="bg-white p-3 rounded-xl mx-auto flex flex-col items-center gap-1 shadow-md">
                <QrCode className="w-24 h-24 text-slate-900" />
                <span className="text-[9px] font-mono text-slate-600 font-bold">SCAN GATE PASS</span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-xl text-xs transition-colors"
                >
                  Close Window
                </button>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );

  
  function renderSeatButton(seatId, price) {
    const seatData = bookedSeatsData[seatId];
    const isBooked = Boolean(seatData);
    const isDirectFriend = seatData?.isDirectFriend || seatData?.relationType === 'FRIEND';
    const isFriendOfFriend = seatData?.isFriendOfFriend || seatData?.relationType === 'FRIEND_OF_FRIEND';
    const isSelected = selectedSeats.includes(seatId);

    let seatStyle = "bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-indigo-600 hover:border-indigo-400 hover:text-white hover:scale-110 shadow-sm";
    
    if (isDirectFriend) {
      seatStyle = "bg-emerald-950 text-emerald-300 border-emerald-500 cursor-not-allowed opacity-95 ring-1 ring-emerald-500/50 shadow-md shadow-emerald-950/80";
    } else if (isFriendOfFriend) {
      seatStyle = "bg-purple-950 text-purple-300 border-purple-500 cursor-not-allowed opacity-95 ring-1 ring-purple-500/50 shadow-md shadow-purple-950/80";
    } else if (isBooked) {
      seatStyle = "bg-slate-950 text-slate-600 border-slate-850 cursor-not-allowed opacity-40";
    } else if (isSelected) {
      seatStyle = "bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400/80 shadow-lg shadow-indigo-600/50 scale-105";
    }

    return (
      <button
        key={seatId}
        onClick={() => handleSeatClick(seatId)}
        disabled={isBooked}
        title={
          isDirectFriend
            ? `Booked by Direct Friend: ${seatData.userName} (${seatData.seatType || 'Seat'})`
            : isFriendOfFriend
              ? `Booked by 2nd-Degree Friend: ${seatData.userName} (${seatData.seatType || 'Seat'})`
              : isBooked 
                ? `Occupied seat` 
                : `Seat ${seatId} (₹${price})`
        }
        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl text-xs sm:text-sm font-bold border flex items-center justify-center transition-all ${seatStyle}`}
      >
        {isDirectFriend ? (
          <UserCheck className="w-4 h-4 text-emerald-300 shrink-0" />
        ) : isFriendOfFriend ? (
          <UserPlus className="w-4 h-4 text-purple-300 shrink-0" />
        ) : (
          seatId
        )}
      </button>
    );
  }
}