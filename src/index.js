require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./api/routes');
const parasiteRoutes = require('../server/api/parasiteRoutes');
const { startAbsenceWorker } = require('../server/jobs/absenceWorker');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiRoutes);
app.use('/api/parasite', parasiteRoutes);

startAbsenceWorker();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Emotional AI server running on port ${PORT}`);
});