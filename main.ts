/**
 * ESP8266 ESP-01 Wifi control via AT commands on BBC micro:bit
 * 
 * by Alan Wang
 */

// Helper function to send AT commands
function sendAT(command: string, waitTime: number = 100): boolean {
    serial.writeString(`${command}\u000D\u000A`);
    basic.pause(waitTime);
    return waitForResponse("OK");
}

// Function to wait for a specific response from the ESP8266
function waitForResponse(str: string): boolean {
    let time = input.runningTime();
    let serialStr = "";
    while (true) {
        serialStr += serial.readString();
        if (serialStr.length > 200) {
            serialStr = serialStr.substr(serialStr.length - 200);
        }
        if (serialStr.includes(str)) {
            return true;
        }
        if (input.runningTime() - time > 30000) { // Reduce timeout for better handling
            break;
        }
    }
    return false;
}

// Function to generate HTML response
function getHTML(normal: boolean): string {
    const webTitle = "ESP8266 (ESP-01) Wifi on BBC micro:bit";
    const htmlHead = `
        HTTP/1.1 200 OK\r\n
        Content-Type: text/html\r\n
        Connection: close\r\n\r\n
        <!DOCTYPE html>
        <html>
        <head>
            <link rel="icon" href="data:,">
            <title>${webTitle}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
            <div style="text-align:center">
                <h1>${webTitle}</h1>
                <br>
                <input type="button" onClick="window.location.href='fore'" value="MOVE FORWARD">
                <input type="button" onClick="window.location.href='back'" value="MOVE BACKWARD">
                <input type="button" onClick="window.location.href='left'" value="MOVE LEFT">
                <input type="button" onClick="window.location.href='right'" value="MOVE RIGHT">
    `;

    const htmlBody = normal ? `
        <h3>LED STATUS: ${LED_status ? "ON" : "OFF"}</h3>
        <h3>Light Level STATUS: ${input.lightLevel().toString()}</h3>
        <h3>Temp STATUS: ${input.temperature().toString()}</h3>
        <br>
        <input type="button" onClick="window.location.href='LED'" value="${LED_status ? "TURN IT OFF" : "TURN IT ON"}">
        <br>
    ` : `
        <h3>ERROR: REQUEST NOT FOUND</h3>
    `;

    const htmlFooter = `
                <br>
                <input type="button" onClick="window.location.href='/'" value="Home">
            </div>
        </body>
        </html>
    `;

    return htmlHead + htmlBody + htmlFooter;
}

// Function to handle commands and update LED status
function handleCommand(command: string): boolean {
    switch (command) {
        case "":
            return true;
        case "Sad":
            toggleLED();
            basic.showIcon(IconNames.Sad);
            return true;
        case "Happy":
            toggleLED();
            basic.showIcon(IconNames.Happy);
            return true;
        case "Spin":
            playSpin();
            return true;
        case "fore":
            moveMotors(maqueenPlusV2.MyEnumDir.Forward);
            return true;
        case "back":
            moveMotors(maqueenPlusV2.MyEnumDir.Backward);
            return true;
        case "left":
            moveMotors(maqueenPlusV2.MyEnumDir.Left);
            return true;
        case "right":
            moveMotors(maqueenPlusV2.MyEnumDir.Right);
            return true;
        default:
            return false;
    }
}

// Helper function to toggle LED status
function toggleLED(): void {
    LED_status = 1 - LED_status;
    pins.digitalWritePin(LED_pin, LED_status);
}

// Helper function to play spin animation
function playSpin(): void {
    music.play(music.stringPlayable("C5 D E G - C5 A F ", 320), music.PlaybackMode.UntilDone);
    for (let index = 0; index < 400; index++) {
        maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.RightMotor, maqueenPlusV2.MyEnumDir.Forward, 20);
        maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.LeftMotor, maqueenPlusV2.MyEnumDir.Backward, 20);
    }
    maqueenPlusV2.controlMotorStop(maqueenPlusV2.MyEnumMotor.AllMotor);
}

// Helper function to move motors
function moveMotors(direction: maqueenPlusV2.MyEnumDir): void {
    const speed = 20;
    switch (direction) {
        case maqueenPlusV2.MyEnumDir.Forward:
            maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.RightMotor, direction, speed);
            maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.LeftMotor, direction, speed);
            break;
        case maqueenPlusV2.MyEnumDir.Backward:
            maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.RightMotor, direction, speed);
            maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.LeftMotor, direction, speed);
            break;
        case maqueenPlusV2.MyEnumDir.Left:
            maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.RightMotor, maqueenPlusV2.MyEnumDir.Forward, speed);
            maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.LeftMotor, maqueenPlusV2.MyEnumDir.Backward, speed);
            break;
        case maqueenPlusV2.MyEnumDir.Right:
            maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.RightMotor, maqueenPlusV2.MyEnumDir.Backward, speed);
            maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.LeftMotor, maqueenPlusV2.MyEnumDir.Forward, speed);
            break;
    }
    basic.pause(400); // Adjust duration as needed
    maqueenPlusV2.controlMotorStop(maqueenPlusV2.MyEnumMotor.AllMotor);
}

// User settings
const WIFI_MODE = 2;
const Tx_pin: SerialPin = SerialPin.P12;
const Rx_pin: SerialPin = SerialPin.P8;
const LED_pin = DigitalPin.P2;
const SSID_1 = "-----";
const PASSWORD_1 = "-----";
const SSID_2 = "LinusToy";
const PASSWORD_2 = "gaylinux";
let LED_status = 0;

// Initialize LED and serial
pins.digitalWritePin(LED_pin, 0);
serial.redirect(Tx_pin, Rx_pin, 115200);

// Send initialization commands
if (!sendAT("AT+RESTORE", 1000) || !sendAT(`AT+CWMODE=${WIFI_MODE};AT+RST`, 1000)) {
    control.reset();
}
if (WIFI_MODE === 1) {
    if (!sendAT(`AT+CWJAP="${SSID_1}","${PASSWORD_1}"`) || !waitForResponse("OK")) {
        control.reset();
    }
} else if (WIFI_MODE === 2) {
    if (!sendAT(`AT+CWSAP="${SSID_2}","${PASSWORD_2}",1,4`, 1000)) {
        control.reset();
    }
}
if (!sendAT("AT+CIPMUX=1") || !sendAT("AT+CIPSERVER=1,80") || !sendAT("AT+CIFSR")) {
    control.reset();
}

// Startup completed
basic.showIcon(IconNames.Yes);

// Process HTTP requests
while (true) {
    let serialStr = serial.readString();
    if (serialStr.length > 200) {
        serialStr = serialStr.substr(serialStr.length - 200);
    }
    if (serialStr.includes("+IPD") && serialStr.includes("HTTP")) {
        const client_ID = serialStr.substr(serialStr.indexOf("IPD") + 4, 1);
        const GET_pos = serialStr.indexOf("GET");
        const HTTP_pos = serialStr.indexOf("HTTP");
        const GET_command = serialStr.substr(GET_pos + 5, HTTP_pos - 1 - (GET_pos + 5));

        const GET_success = handleCommand(GET_command);
        const HTML_str = getHTML(GET_success);

        sendAT(`AT+CIPSEND=${client_ID},${HTML_str.length + 2}`);
        sendAT(HTML_str, 1000);
        sendAT(`AT+CIPCLOSE=${client_ID}`);
        serialStr = "";
    }
}
