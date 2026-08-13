import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

export const fetchUsers = () => axios.get(`${API_BASE}/users`);
export const fetchAllMovies = (userId) => axios.get(`${API_BASE}/movies`, { params: { userId } });
export const fetchRecommendations = (userId) => axios.get(`${API_BASE}/users/${userId}/recommendations`);
export const fetchMovieGraph = (movieId) => axios.get(`${API_BASE}/movies/${movieId}/graph`);
export const fetchMovieShowtimes = (movieId, userId) => axios.get(`${API_BASE}/movies/${movieId}/showtimes`, { params: { userId } });
export const fetchShowtimeSeats = (showtimeId, userId) => axios.get(`${API_BASE}/showtimes/${showtimeId}/seats`, { params: { userId } });
export const bookTicket = (bookingData) => axios.post(`${API_BASE}/bookings`, bookingData);
export const fetchUserBookings = (userId) => axios.get(`${API_BASE}/users/${userId}/bookings`);