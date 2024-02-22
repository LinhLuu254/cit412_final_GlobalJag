const {Storage} = require('@google-cloud/storage');
const path =require('path');
const fs = require('fs-extra');
const os = require('os');
const sharp = require('sharp');

exports.generateThumbData = async (file, context) => {

    //Hint
    const version = process.env.K_VERSION;
    console.log(`Running Cloud Function version ${version}`);

    await generateThumbnails(file, context);
}


// Entry point function
const generateThumbnails = async (file, context) => {

    const gcsFile = file;
    const storage = new Storage();
    const sourceBucket = storage.bucket(gcsFile.bucket);
    const thumbnailsBucket = storage.bucket('sp24-cit412-lluu-gj-thumbnails');
    const finalBucket = storage.bucket('sp24-cit412-lluu-gj-final');


    console.log(`File name: ${gcsFile.name}`);
    console.log(`Generation: ${gcsFile.generation}`);
    console.log(`Content type: ${gcsFile.contentType}`);

     // Reject images that are not jpeg or png 
    let fileExtension = '';
    let validFile = false;

    if (gcsFile.contentType === 'image/jpeg') {
        console.log('This is a JPG file');
        fileExtension = 'jpg';
        validFile = true;
    
      } else if (gcsFile.contentType === 'image/png'){
        console.log('This is a PNG file');
        fileExtension = 'png';
        validFile = true;
    
      } else {
        console.log('This is not a valid file');
      }

    if (validFile) {
    // Create a new filename for the 'final' version of the image file

    const finalFileName = `${gcsFile.generation}.${fileExtension}`

    // Create a working directory on the VM that runs our GCF to download the original file
    // The value of this variable will be something like 'tmp/thumbs'
    const workingDir = path.join(os.tmpdir(), 'thumb');

    // Create a variable that holds the path to the 'local' version of the file

    const tempFilePath = path.join(workingDir, finalFileName)

    // Wait until the working directory is ready
    await fs.ensureDir(workingDir);

    // Download the original file to the path on the 'local' VM
    await sourceBucket.file(gcsFile.name).download({
        destination: tempFilePath
    });

    // Upload our local version of the file to the final images bucket
    await finalBucket.upload(tempFilePath);

    // Create a name for the thumbnail image
    const thumbName = `thumb@64_${finalFileName}`;

    // Create a path where we will store the thumbnail image locally
    const thumbPath = path.join(workingDir, thumbName);

    // Use the sharp library to generate the thumbnail image and save it to the thumbPath
    // Then upload the thumbnail to the thumbnailsBucket in cloud storage
    await sharp(tempFilePath)
    .resize(64)
    .withMetadata()
    .toFile(thumbPath)
    .then( async () => {
        await thumbnailsBucket.upload(thumbPath)
    });

    // Delete the temp working directory and its files from the GCF's VM
    await fs.remove(workingDir);
    } 

    // DELETE the original file uploaded to the "Uploads" bucket
    await sourceBucket.file(gcsFile.name).delete();
    console.log(`Deleted uploaded file: ${gcsFile.name}`)
};