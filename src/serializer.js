/*global require, module*/

module.exports = serialize;

var EMPTY = new ArrayBuffer(0);

function serialize(data) {
    return data.schedule.map(serializeSchedule).reduce(joinArrayBuffers, EMPTY);
}

//////////////  SERIALIZATION

function serializeSchedule(schedule) {
    var id = stringToArrayBuffer(schedule.id, 3),
        routes = schedule.routes.map(serializeRoute).reduce(joinArrayBuffers, EMPTY);

    return joinArrayBuffers(id, routes);
}

function serializeRoute(route) {
    var code = stringToArrayBuffer(route.code, 9),
        stops = route.stops.map(serializeStop).reduce(joinArrayBuffers, EMPTY);

    return joinArrayBuffers(code, stops);
}

function serializeStop(stop) {
    return [
        int32ToArrayBuffer(stop.id),
        int8ToArrayBuffer(stop.min),
        int8ToArrayBuffer(stop.max),
        int32ToArrayBuffer(stop.street),
        arr(stop.schedulesByDays).map(serializeScheduleByDay).reduce(joinArrayBuffers, EMPTY)
    ].reduce(joinArrayBuffers);

}

function serializeScheduleByDay(scheduleByDay) {
    var dayType = int8ToArrayBuffer(scheduleByDay.dayType),
        departuresPerHour = parseDeparturesPerHour(arr(scheduleByDay.departuresPerHour));

    return joinArrayBuffers(dayType, departuresPerHour);
}

function parseDeparturesPerHour(departuresPerHour) {
    var buffer = new Int32Array(departuresPerHour.length * 2 + 1);
    addHours(buffer, departuresPerHour);
    return buffer;
}

function addHours(targetArray, departuresPerHour) {
    var position = 1;
    targetArray[0] = buildHours(departuresPerHour);
    departuresPerHour.forEach(function (departure) {
        addMinutes(targetArray, position, departure);
        position += 2;
    });
}

function buildHours(departuresPerHour) {
    var hour, result = 0;
    for (hour = 0; hour < 24; hour++) {
        if (containsHour(departuresPerHour, hour)) {
            result = result | (1 << hour);
        }
    }
    return result;
}

function containsHour(departures, hour) {
    return departures.some(function (departure) {
        return departure.hour === hour;
    });
}

function addMinutes(targetArray, position, departurePerHour) {
    var minutes = [0, 0];
    departurePerHour.departures.forEach(function (minuteItem) {
        var value = minuteItem.minute,
            i = value <= 32 ? 0 : 1;
        minutes[i] = minutes[i] | (1 << value);
    });
    targetArray[position] = minutes[0];
    targetArray[position + 1] = minutes[1];
}

//////////////  UTILITIES

/**
 * @param {number|string} value
 * @returns {ArrayBuffer}
 */
function int32ToArrayBuffer(value) {
    return new Int32Array([parseInt(value)]).buffer;
}

/**
 * @param {number|string} value
 * @returns {ArrayBuffer}
 */
function int8ToArrayBuffer(value) {
    return new Int8Array([parseInt(value)]).buffer;
}

/**
 * @param {string} string
 * @param {number} length
 * @returns {ArrayBuffer}
 */
function stringToArrayBuffer(string, length) {
    var array = string.split('').map(function (char) {
            return char.charCodeAt(0);
        }),
        byteArray = new Uint8Array(length);
    byteArray.set(array);
    return byteArray.buffer;
}

/**
 * @param {ArrayBuffer} buffer1
 * @param {ArrayBuffer} buffer2
 * @returns {ArrayBuffer}
 */
function joinArrayBuffers(buffer1, buffer2) {
    var resultBuffer = new Int8Array(buffer1.byteLength + buffer2.byteLength);
    resultBuffer.set(new Int8Array(buffer1));
    resultBuffer.set(new Int8Array(buffer2), buffer1.byteLength);
    return resultBuffer.buffer;
}

function arr(array) {
    return array || [];
}