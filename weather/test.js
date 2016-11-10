var SensorTag = require('sensortag');		// sensortag library
var Async = require('async');

var Protocol = require('azure-iot-device-amqp').Amqp;
var Client = require('azure-iot-device').Client;
var ConnectionString = require('azure-iot-device').ConnectionString;
var Message = require('azure-iot-device').Message;


var connectionString = 'HostName=srramiothub.azure-devices.net;DeviceId=TIEnsemble;SharedAccessKey=cVPVBoaK/kMOb55Q+2To6MNeZPp0F4Tsn8sIwxnEnPs=';

var deviceId = ConnectionString.parse(connectionString).DeviceId;

var client = Client.fromConnectionString(connectionString, Protocol);

client.open(function (error, result) {
    if (error)
    {
        console.log("Connectivity error: %s...", error);
        return;
    }

    SensorTag.discoverAll(function (sensorTag) {
        console.log("Connecting to %s...", sensorTag.id);
        
        sensorTag.on('disconnect', function() {
            console.log("Disconnected from %s!", sensorTag.id);
            process.exit(0);
        });
        
        sensorTag.connectAndSetUp(function (error) { 
            console.log("Connected to %s...", sensorTag.id);
            
            Async.series([
                function (callback)
                {
                    console.log("Starting IR temperatures sensor for %s...", sensorTag.id);
                    sensorTag.enableIrTemperature(callback);
                },
                
                function (callback)
                {
                    console.log("Starting humidity sensor for %s...", sensorTag.id);
                    sensorTag.enableHumidity(callback);
                },
                
                function (callback)
                {
                    console.log("Starting pressure sensor for %s...", sensorTag.id);
                    sensorTag.enableBarometricPressure(callback);
                },
                
                function (callback)
                {
                    console.log("Starting light intensity sensor for %s...", sensorTag.id);
                    sensorTag.enableLuxometer(callback);
                }
            ], function () {
                setInterval(function () {
                    var readings = { sensorId: sensorTag.id };
                    Async.series([
                        function (callback)
                        {
                            sensorTag.readHumidity(function (error, temperature, humidity)
                            {
                                readings.humidity = humidity;
                                readings.temperatureFromHumidity = temperature;
                                
                                callback();
                            });
                        },
                        function (callback)
                        {
                            sensorTag.readIrTemperature(function (error, objectTemperature, ambientTemperature) 
                            {
                                readings.objectTemperature = objectTemperature;
                                readings.temperatureFromIr = ambientTemperature;
                                
                                callback();
                            });
                        },
                        function (callback)
                        {
                            sensorTag.readBarometricPressure(function (error, pressure)
                            {
                                readings.pressure = pressure;
                                
                                callback();
                            });
                        },
                        function (callback)
                        {
                            sensorTag.readLuxometer(function (error, lux){
                                readings.lux = lux;
                                
                                callback();
                            });
                        }
                    ], function()
                    {
                        readings.currentTime = new Date();
                        
                        var message = new Message(JSON.stringify(readings));

                        console.log("Printing Message.........",message);

                       client.sendEvent(message, function (error) {
                            if (error)
                            {
                                console.log(error.toString());
                            } 
                            else
                            {
                                console.log("Data sent on %s...", readings.currentTime);
                            }
                        });
                        
                    });
                }, 60000);
            });
        });
    });
});