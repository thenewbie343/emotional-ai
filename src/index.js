require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./api/routes');
const parasiteRoutes = require('./api/parasiteRoutes');
const { startAbsenceWorker } = require('./jobs/absenceWorker');

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: process.env.CLIENT_URL || '*',
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiRoutes);
app.use('/api/parasite', parasiteRoutes);

startAbsenceWorker();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Emotional AI server running on port ${PORT}`);
});