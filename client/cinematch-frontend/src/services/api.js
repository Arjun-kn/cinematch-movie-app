import axios from 'axios';

// Live Render Backend API URL with environment variable support
const API_BASE = import.meta.env.VITE_API_URL || 'https://cinematch-backend-h9e9.onrender.com/api';

export const fetchUsers = () => axios.get(`${API_BASE}/users`);
export const fetchAllMovies = (userId) => axios.get(`${API_BASE}/movies`, { params: { userId } });
export const fetchRecommendations = (userId) => axios.get(`${API_BASE}/users/${userId}/recommendations`);
export const fetchMovieGraph = (movieId) => axios.get(`${API_BASE}/movies/${movieId}/graph`);
export const fetchMovieShowtimes = (movieId, userId) => axios.get(`${API_BASE}/movies/${movieId}/showtimes`, { params: { userId } });
export const fetchShowtimeSeats = (showtimeId, userId) => axios.get(`${API_BASE}/showtimes/${showtimeId}/seats`, { params: { userId } });
export const bookTicket = (bookingData) => axios.post(`${API_BASE}/bookings`, bookingData);
export const fetchUserBookings = (userId) => axios.get(`${API_BASE}/users/${userId}/bookings`);