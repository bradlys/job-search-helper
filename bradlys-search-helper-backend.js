/*global chrome */
'use strict';


var db = new localStorageDB("jobsearch", localStorage);

// Check if the database was just created. Useful for initial database setup
if( db.isNew() ) {
    // create the "companies" table
    db.createTable("companies", ["name", "date", "action"]);
    db.commit();
}

window.addEventListener('message', function(event) {
    if (event.source !== window) return false;
    let PURPOSES = {'EVERYTHING': EVERYTHING, 'addVisited': addVisited, 'addApplied': addApplied};
    let msg = event.data;
    if (!('purpose' in msg) || !(msg.purpose in PURPOSES)) return false;
    let funcToBeCalled = PURPOSES[msg.purpose];
    if ('data' in msg) {
        funcToBeCalled(msg.data);
    } else {
        funcToBeCalled();
    }
});

function addVisited(data) {
    for(let item of data) {
        if (!('name' in item) || !('date' in item) || item.name === null || item.date === null) continue;
        item.action = 'visited';
        if (db.queryAll('companies', {query: {name: item.name, date: item.date, action: item.action }}).length > 0) continue;
        db.insert("companies", item);
    }
    db.commit();
}

function addApplied(data) {
    for(let item of data) {
        if (!('name' in item) || !('date' in item) || item.name === null || item.date === null) continue;
        item.action = 'applied';
        if (db.queryAll('companies', {query: {name: item.name, date: item.date, action: item.action }}).length > 0) continue;
        db.insert("companies", item);
    }
    db.commit();
}

function postStorageEvent(result) {
    window.postMessage({purpose: 'storageEvent', data: result}, "*");
}

/**
 * Bradly, bring me everything.
 * What do you mean everything?
 8 8888888888 `8.`888b           ,8' 8 8888888888   8 888888888o. `8.`8888.      ,8' 8888888 8888888888 8 8888        8  8 8888 b.             8     ,o888888o.
 8 8888        `8.`888b         ,8'  8 8888         8 8888    `88. `8.`8888.    ,8'        8 8888       8 8888        8  8 8888 888o.          8    8888     `88.
 8 8888         `8.`888b       ,8'   8 8888         8 8888     `88  `8.`8888.  ,8'         8 8888       8 8888        8  8 8888 Y88888o.       8 ,8 8888       `8.
 8 8888          `8.`888b     ,8'    8 8888         8 8888     ,88   `8.`8888.,8'          8 8888       8 8888        8  8 8888 .`Y888888o.    8 88 8888
 8 888888888888   `8.`888b   ,8'     8 888888888888 8 8888.   ,88'    `8.`88888'           8 8888       8 8888        8  8 8888 8o. `Y888888o. 8 88 8888
 8 8888            `8.`888b ,8'      8 8888         8 888888888P'      `8. 8888            8 8888       8 8888        8  8 8888 8`Y8o. `Y88888o8 88 8888
 8 8888             `8.`888b8'       8 8888         8 8888`8b           `8 8888            8 8888       8 8888888888888  8 8888 8   `Y8o. `Y8888 88 8888   8888888
 8 8888              `8.`888'        8 8888         8 8888 `8b.          8 8888            8 8888       8 8888        8  8 8888 8      `Y8o. `Y8 `8 8888       .8'
 8 8888               `8.`8'         8 8888         8 8888   `8b.        8 8888            8 8888       8 8888        8  8 8888 8         `Y8o.`    8888     ,88'
 8 888888888888        `8.`          8 888888888888 8 8888     `88.      8 8888            8 8888       8 8888        8  8 8888 8            `Yo     `8888888P'
 */
function EVERYTHING() {
    window.postMessage({purpose: 'EVERYTHING', data: db.queryAll('companies')});
}

