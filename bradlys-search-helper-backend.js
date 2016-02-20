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

    function addVisited(data) {
        if (data.name === null) return false;
        if (!('date' in data) || data.date === null) data.date = Date.now() / 1000 | 0;
        data.action = 'applied';
        if (db.queryAll('companies', {query: {name: data.name, date: data.date, action: 'visited' }}).length > 0) return false;
        db.insert("companies", data);
        db.commit();
    }

    function addApplied(data) {
        if (data.name === null) return false;
        if (!('date' in data) || data.date === null) data.date = Date.now() / 1000 | 0;
        data.action = 'applied';
        if (db.queryAll('companies', {query: {name: data.name, date: data.date, action: 'applied' }}).length > 0) return false;
        db.insert("companies", data);
        db.commit();
    }

    function addManyApplied(data) {
        for(let item of data) {
            if (!('name' in data) || !('date' in data) || data.name === null || data.date === null) continue;
            data.action = 'applied';
            if (db.queryAll('companies', {query: {name: item.name, date: item.date, action: 'applied' }}).length > 0) continue;
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

});

