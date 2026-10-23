#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <DHT.h>

// =========================
// WiFi DETAILS
// =========================
const char* ssid = "Vishnu";
const char* password = "Vishnu@24";

// =========================
// HIVEMQ DETAILS
// =========================
const char* mqtt_server =
"f4458bd5aa2f41f3940ab10a95ef7a8d.s1.eu.hivemq.cloud";

const int mqtt_port = 8883;

const char* mqtt_username = "smartcampus";
const char* mqtt_password = "smartcampus";

// =========================
// PIN DEFINITIONS
// =========================
#define DHTPIN 4
#define DHTTYPE DHT11

#define IR_PIN 27

#define RELAY1 18
#define RELAY2 19

// Most relay modules are ACTIVE LOW
#define RELAY_ON LOW
#define RELAY_OFF HIGH

// =========================
// OBJECTS
// =========================
DHT dht(DHTPIN, DHTTYPE);

WiFiClientSecure espClient;
PubSubClient client(espClient);

// =========================
// VARIABLES
// =========================
unsigned long lastMsg = 0;
unsigned long lastIRTime = 0;

int peopleCount = 0;
bool isInitialSessionBoot = true;

int lastIRState = HIGH;

// Temperature limit for fan
float fanTemperature = 28.0;

// =========================
// WIFI CONNECTION
// =========================
void setupWiFi() {

  Serial.print("Connecting to WiFi");

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {

    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi Connected!");

  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

// =========================
// MQTT CONNECTION
// =========================
void connectMQTT() {

  while (!client.connected()) {

    Serial.print("Connecting to HiveMQ...");

    String clientID = "ESP32-Campus-";
    clientID += String(random(0xffff), HEX);

    if (client.connect(
          clientID.c_str(),
          mqtt_username,
          mqtt_password)) {

      Serial.println("CONNECTED!");

      // Send connection message
      client.publish(
        "campus/status",
        "ESP32 Campus System Connected"
      );

    } else {

      Serial.print("FAILED, rc=");
      Serial.println(client.state());

      delay(5000);
    }
  }
}

// =========================
// SETUP
// =========================
void setup() {

  Serial.begin(115200);

  // DHT
  dht.begin();

  // IR
  pinMode(IR_PIN, INPUT);

  // Relay
  pinMode(RELAY1, OUTPUT);
  pinMode(RELAY2, OUTPUT);

  // Initially OFF
  digitalWrite(RELAY1, RELAY_OFF);
  digitalWrite(RELAY2, RELAY_OFF);

  // WiFi
  setupWiFi();

  // Secure MQTT
  espClient.setInsecure();

  client.setServer(mqtt_server, mqtt_port);

  Serial.println("--------------------------------");
  Serial.println("SMART CAMPUS SYSTEM STARTED");
  Serial.println("--------------------------------");
}

// =========================
// MAIN LOOP
// =========================
void loop() {

  // Make sure MQTT is connected
  if (!client.connected()) {
    connectMQTT();
  }

  client.loop();

  // Initialize counting session to 0 on initial boot connection (does not re-trigger on subsequent reconnections)
  if (isInitialSessionBoot && client.connected()) {
    peopleCount = 0;
    client.publish("campus/people", "0");
    client.publish("campus/status", "ESP32 Campus System Started (Session 0)");
    isInitialSessionBoot = false;
    Serial.println("Initial session counter initialized to 0 and published.");
  }

  // =========================
  // IR SENSOR
  // =========================

  int irState = digitalRead(IR_PIN);

  // Detect object/person
  if (irState == LOW && lastIRState == HIGH) {

    // Avoid multiple counts
    if (millis() - lastIRTime > 1000) {

      peopleCount++;

      lastIRTime = millis();

      Serial.print("Person Detected! Count = ");
      Serial.println(peopleCount);

      // Publish people count
      char peopleData[10];

      sprintf(
        peopleData,
        "%d",
        peopleCount
      );

      client.publish(
        "campus/people",
        peopleData
      );
    }
  }

  lastIRState = irState;


  // =========================
  // SENSOR READING EVERY 5 SEC
  // =========================

  if (millis() - lastMsg > 5000) {

    lastMsg = millis();

    // Read DHT11
    // Read DHT11 sensor
    float humidity = dht.readHumidity();

    delay(100);

    float temperature = dht.readTemperature();

    // Check sensor readings
    if (isnan(temperature) || isnan(humidity)) {
      Serial.println("DHT11 reading failed!");
      Serial.println("Check sensor wiring, GPIO 4, and sensor type.");
    } else {
      Serial.print("Temperature: ");
      Serial.print(temperature);
      Serial.println(" C");

      Serial.print("Humidity: ");
      Serial.print(humidity);
      Serial.println(" %");
    }

    // Check sensor
    if (isnan(temperature) || isnan(humidity)) {

      Serial.println("DHT11 reading failed!");

      return;
    }

    // =========================
    // FAN CONTROL
    // =========================

    if (temperature >= fanTemperature) {

      digitalWrite(RELAY2, RELAY_ON);

      client.publish(
        "campus/fan",
        "ON"
      );

    } else {

      digitalWrite(RELAY2, RELAY_OFF);

      client.publish(
        "campus/fan",
        "OFF"
      );
    }


    // =========================
    // LIGHT CONTROL
    // =========================

    if (peopleCount > 0) {

      digitalWrite(RELAY1, RELAY_ON);

      client.publish(
        "campus/light",
        "ON"
      );

    } else {

      digitalWrite(RELAY1, RELAY_OFF);

      client.publish(
        "campus/light",
        "OFF"
      );
    }


    // =========================
    // CONVERT VALUES
    // =========================

    char tempData[10];
    char humidityData[10];

    dtostrf(
      temperature,
      4,
      2,
      tempData
    );

    dtostrf(
      humidity,
      4,
      2,
      humidityData
    );


    // =========================
    // PUBLISH TO HIVEMQ
    // =========================

    client.publish(
      "campus/temperature",
      tempData
    );

    client.publish(
      "campus/humidity",
      humidityData
    );


    // =========================
    // SERIAL MONITOR
    // =========================

    Serial.println();
    Serial.println("--------------------------------");

    Serial.print("Temperature: ");
    Serial.print(temperature);
    Serial.println(" °C");

    Serial.print("Humidity: ");
    Serial.print(humidity);
    Serial.println(" %");

    Serial.print("People Count: ");
    Serial.println(peopleCount);

    Serial.print("Light: ");

    if (peopleCount > 0)
      Serial.println("ON");
    else
      Serial.println("OFF");

    Serial.print("Fan: ");

    if (temperature >= fanTemperature)
      Serial.println("ON");
    else
      Serial.println("OFF");

    Serial.println("--------------------------------");
  }
}