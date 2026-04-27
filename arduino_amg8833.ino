#include <Wire.h>
#include <Adafruit_AMG88xx.h>

Adafruit_AMG88xx amg;

float pixels[AMG88XX_PIXEL_ARRAY_SIZE];

void setup() {
    Serial.begin(115200);
    Serial.println(F("AMG8833 Thermal Camera Test"));

    bool status;
    
    // default settings
    status = amg.begin();
    if (!status) {
        Serial.println("Could not find a valid AMG8833 sensor, check wiring!");
        while (1);
    }
    
    delay(100); // let sensor boot up
}


void loop() {
    //read all the pixels
    amg.readPixels(pixels);

    // Output pixels as comma separated values
    for(int i=1; i<=AMG88XX_PIXEL_ARRAY_SIZE; i++){
      Serial.print(pixels[i-1]);
      if(i < AMG88XX_PIXEL_ARRAY_SIZE) Serial.print(",");
    }
    Serial.println("---"); // Frame delimiter

    // Small delay to match sensor refresh rate (10Hz)
    delay(100);
}
