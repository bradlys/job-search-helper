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
    let PURPOSES = {'getCompany': getCompany, 'addVisited': addCompanyDetail, 'addApplied': addCompanyDetail};
    let msg = event.data;
    if (!('purpose' in msg) || !(msg.purpose in PURPOSES)) return false;
    let funcToBeCalled = PURPOSES[msg.purpose];
    if ('data' in msg) {
        funcToBeCalled(msg.data);
    } else {
        funcToBeCalled();
    }
});

let validActions = {'applied' : true, 'visited' : true};

function addCompanyDetail(data) {
    let pushedCompanies = [];
    for(let item of data) {
        if (!('name' in item) || !('date' in item) || item.name === null || item.date === null) continue;
        let action = 'visited';
        let date = Date.now();
        if ('action' in item) {
            action = item.action;
            date = item.date;
        } else if ('visited' in item) {
            if (item.visited === false) continue;
            action = 'visited';
            date = item.visited;
        } else if ('applied' in item) {
            if (item.applied === false) continue;
            action = 'applied';
            date = item.applied;
        }
        if (typeof(date) !== 'number') {
            console.log("Invalid date! " + date);
            continue;
        }
        if (typeof(action) !== 'string' || action.length < 1 || !(action in validActions)) {
            console.log("Invalid action! " + action);
            continue;
        }
        if (typeof(action) !== 'string' || !item.name || item.name.length < 1) {
            console.log("Invalid name! " + name);
            continue;
        }
        let name = item.name;
        if (db.queryAll('companies', {query: {name: name, date: date, action: action }}).length > 0) continue;
        let ID = db.insert("companies", {name: name, date: date, action: action });
        pushedCompanies.push(db.queryAll('companies', {query: {ID: ID}})[0]);
    }
    db.commit();
    window.postMessage({purpose: 'returnCompany', data: pushedCompanies}, "*");
}

function getCompany(data) {
    if (!data || !('name' in data) || (data.name.length < 1)) {
        window.postMessage({purpose: 'returnCompany', data: db.queryAll('companies')}, "*");
    } else {
        window.postMessage({purpose: 'returnCompany', data: db.queryAll('companies', {query: {name: data.name}})}, "*");
    }
}

