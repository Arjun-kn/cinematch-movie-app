const express = require('express');
const router = express.Router();

const { getUsers } = require('../controllers/userController');
const { getRecommendations, getMovieGraph, getShowtimesForMovie, getShowtimeSeats, getAllMovies } = require('../controllers/movieController');
const { createBooking, getUserBookings } = require('../controllers/bookingController');

router.get('/users', getUsers);
router.get('/users/:userId/recommendations', getRecommendations);
router.get('/users/:userId/bookings', getUserBookings);
router.get('/movies', getAllMovies);
router.get('/movies/:movieId/graph', getMovieGraph);
router.get('/movies/:movieId/showtimes', getShowtimesForMovie);
router.get('/showtimes/:showtimeId/seats', getShowtimeSeats);
router.post('/bookings', createBooking);

module.exports = router;