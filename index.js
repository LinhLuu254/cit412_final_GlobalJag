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

    // DELETE the original file uploaded to the "Uploads" bucket
    await sourceBucket.file(gcsFile.name).delete();
    console.log(`Deleted uploaded file: ${gcsFile.name}`)
}