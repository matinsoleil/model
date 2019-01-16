<head>
<script src="https://cdn.jsdelivr.net/npm/exif-js"></script>
</head>
<body>

<img id="img2" src="./exif-samples-master/jpg/gps/CRUZE.jpg" />

<div id="allMetaDataSpan" ></div>

<?php

require __DIR__ . '/vendor/autoload.php';

use lsolesen\pel\PelDataWindow;
use lsolesen\pel\PelJpeg;
use lsolesen\pel\PelTiff;
use lsolesen\pel\PelTag;
use lsolesen\pel\PelEntryAscii;

$exif = exif_read_data('./exif-samples-master/jpg/gps/CRUZE.jpg');
var_dump($exif);

$lon = getGps($exif["GPSLongitude"], $exif['GPSLongitudeRef']);
$lat = getGps($exif["GPSLatitude"], $exif['GPSLatitudeRef']);
var_dump($lat, $lon);


$pathfile = "./exif-samples-master/jpg/gps/CRUZE.jpg";

$data = new PelDataWindow(file_get_contents($pathfile));

if (PelJpeg::isValid($data)) {
    /*
     * The data was recognized as JPEG data, so we create a new empty
     * PelJpeg object which will hold it. When we want to save the
     * image again, we need to know which object to same (using the
     * getBytes method), so we store $jpeg as $file too.
     */
    $jpeg = $file = new PelJpeg();
    
    $jpeg->load($data);
    /*
     * The PelJpeg object contains a number of sections, one of which
     * might be our Exif data. The getExif() method is a convenient way
     * of getting the right section with a minimum of fuzz.
     */
    $exif = $jpeg->getExif();

    $tiff = $exif->getTiff();

    $ifd0 = $tiff->getIfd();

   $desc = $ifd0->getEntry(PelTag::IMAGE_DESCRIPTION);
   if ($desc == null) {
      var_dump('None');   
    $description = "Colonia del Valle, avenida Division del Norte";
    
    $desc = new PelEntryAscii(PelTag::IMAGE_DESCRIPTION, $description);
    
    $ifd0->addEntry($desc);
    $file->saveFile($pathfile);    
   } 

}


function getGps($exifCoord, $hemi) {

    $degrees = count($exifCoord) > 0 ? gps2Num($exifCoord[0]) : 0;
    $minutes = count($exifCoord) > 1 ? gps2Num($exifCoord[1]) : 0;
    $seconds = count($exifCoord) > 2 ? gps2Num($exifCoord[2]) : 0;

    $flip = ($hemi == 'W' or $hemi == 'S') ? -1 : 1;

    return $flip * ($degrees + $minutes / 60 + $seconds / 3600);

}

function gps2Num($coordPart) {

    $parts = explode('/', $coordPart);

    if (count($parts) <= 0)
        return 0;

    if (count($parts) == 1)
        return $parts[0];

    return floatval($parts[0]) / floatval($parts[1]);
}

?>
<script>
window.onload=getExif;

function getExif() {
 

    var img2 = document.getElementById("img2");
    EXIF.getData(img2, function() {
        var allMetaData = EXIF.getAllTags(this);
        var allMetaDataSpan = document.getElementById("allMetaDataSpan");
  
        console.log(allMetaData);

        // degrees, minutes, seconds, direction
        let ldg = (allMetaData.GPSLatitude[0]['numerator'])/(allMetaData.GPSLatitude[0]['denominator']);
        let lmi = (allMetaData.GPSLatitude[1]['numerator'])/(allMetaData.GPSLatitude[1]['denominator']);
        let lsec = (allMetaData.GPSLatitude[2]['numerator'])/(allMetaData.GPSLatitude[2]['denominator']);
        let ldir = (allMetaData.GPSLatitudeRef);


        let lat = ConvertDMSToDD(ldg,lmi,lsec,ldir);

        // degrees, minutes, seconds, direction

        let lgdg = (allMetaData.GPSLongitude[0]['numerator'])/(allMetaData.GPSLongitude[0]['denominator']);
        let lgmi = (allMetaData.GPSLongitude[1]['numerator'])/(allMetaData.GPSLongitude[1]['denominator']);
        let lgsec = (allMetaData.GPSLongitude[2]['numerator'])/(allMetaData.GPSLongitude[2]['denominator']);
        let lgdir = (allMetaData.GPSLongitudeRef);


         let long = ConvertDMSToDD(lgdg,lgmi,lgsec,lgdir)

        //allMetaDataSpan.innerHTML = JSON.stringify(allMetaData, null, "\t");
        allMetaDataSpan.innerHTML = lat+','+long;

    });

}

function ConvertDMSToDD(degrees, minutes, seconds, direction) {
    var dd = degrees + minutes/60 + seconds/(60*60);

    if (direction == "S" || direction == "W") {
        dd = dd * -1;
    } // Don't do anything for N or E
    return dd;
}

</script>
</body>
</html>
