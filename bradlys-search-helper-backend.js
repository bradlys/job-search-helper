/*global chrome */
'use strict';

//Utilizing localStorageDB as the handler for local storage operations, this emulates a relational DB.
var db = new localStorageDB("jobsearch", localStorage);

/**
 * Companies are stored via 4 column rows.
 * ID - Unique key, primary
 * name - string, name of the company
 * action - string, action that this row represents
 * date - number, unix timestamp indicating when this action took place
 *
 * Therefore we can tell when a company was last visited by finding the newest row with action = visited.
 * We can also find how many times a company was applied to by counting the number of rows with action = applied
 * and name = $company.
 *
 * This structure may change over time but this works for now.
 * Many reasons for this structure. It is slow but it doesn't lack info.
 */

// Check if the database was just created(i.e. we've never run this program before or someone cleared the storage).
// Useful for initial database setup
if( db.isNew() ) {
    // create the "companies" table
    db.createTable("companies", ["name", "date", "action"]);
    db.commit();
}

//Valid purposes for the messages being posted and the functions related to the purpose, ignore everything that isn't here
let PURPOSES = {'getCompany': getCompany, 'addCompany': addCompanyDetail};
//Add an event listener to the window and listen for messages to be posted.
window.addEventListener('message', function(event) {
    if (event.source !== window) return false;
    let msg = event.data;
    if (!('purpose' in msg) || !(msg.purpose in PURPOSES)) return false;
    let funcToBeCalled = PURPOSES[msg.purpose];
    if ('data' in msg) {
        funcToBeCalled(msg.data);
    } else {
        funcToBeCalled();
    }
});

//Valid actions for the Company rows.
let validActions = {'applied' : true, 'visited' : true};

/**
 * Add a company detail to the database if it doesn't exist already. If an exact duplicate exists, don't add another.
 * Otherwise, add it.
 *
 * @param {Array} data - company name-action-date objects with possibility of them also being name-applied/visited objects.
 */
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

/**
 * Is there a company detail object that is close in date (+-1 hour) of the provided detail name, date, and action?
 *
 * @param {string} name
 * @param {number} date
 * @param {string} action
 * @returns {boolean}
 */
function doesActionInCloseDateExist(name, date, action) {
    let result = db.queryAll('companies', { query : function (row) {
        if (row.name === name && row.action === action) {
            if (Math.abs(row.date - date) < 60*60*1000) return true;
        }
        return false;
    }});
    return result.length > 0;
}

/**
 * Posts the company(s) to the window with a returnCompany purpose.
 *
 * @param {Array} data - companies row objects
 */
function getCompany(data) {
    if (!data || !('name' in data) || (data.name.length < 1)) {
        window.postMessage({purpose: 'returnCompany', data: db.queryAll('companies')}, "*");
    } else {
        window.postMessage({purpose: 'returnCompany', data: db.queryAll('companies', {query: {name: data.name}})}, "*");
    }
}
