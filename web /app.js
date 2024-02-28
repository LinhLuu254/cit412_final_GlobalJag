// Import packages
const express = require('express');
const path = require('path');
const Multer = require('multer');
const {Storage} = require('@google-cloud/storage');

  // Set the port
  const port = 8080;

  // Create instances of necessary packages
  const app = express();
  const storage = new Storage();

  // Set the identifier for the GCS bucket where the file will be stored
  const bucket = storage.bucket('sp24-cit412-lluu-gj-uploads');

  // Configure an instance of multer
  const multer = Multer({
    storage: Multer.memoryStorage(),
    limit: {
      fileSize: 15 * 1024 * 1024
    }
  });

  // Middleware
  app.use('/js', express.static(__dirname + '/public/js'));
  app.use('/css', express.static(__dirname + '/public/css'));
  app.use('/images', express.static(__dirname + '/public/images'));


// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/public/index.html'));
});

app.post('/upload', multer.single('file'),(req, res) => {
  // res.redirect('/');

  //Ensure a file was uploaded from the form
  //If not, respond with a simple message and return from this function
  if(!req.file){
    res.status(400).send('No file uploaded')
    return; 
  }

  // This will run if a file uploaded
  // Create a streaming target where the file will be stored in GCS
  const blob = bucket.file(req.file.originalname);

  //Begin streaming the file to GCS
  const blobStream = blob.createWriteStream();

  //When the file uploaded, redirect to the browser to home page
  blobStream.on('finish', () => {
    const uploadedFile = `${bucket.name}/${blob.name}`;
    console.log(`File uploaded: ${uploadedFile}`);
  })

  // colse the stream
  blobStream.end(req.file.buffer);

});

app.listen(port, () => {
  console.log(`GlobalJags Web App listening on port ${port}`);
});