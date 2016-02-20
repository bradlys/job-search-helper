/*global chrome*/
(function(){
    "use strict";
    let JOB_SEARCH_ON = false;
    //this is part of the crunchbase implementation. This is my copy of it. It tracks some state.
    var bradlysTrack = {
        lis: $('.results').find('li'),
        windowHeight: $(document).outerHeight(),
        currentScroll: $(window).scrollTop(),
        shouldMakeRequest: false,
        requestLength: 20,
        initHeight: $('.search-results').outerHeight(),
        finished: false,
        stickySearch: $('.sticky-search'),
        stickySearchOffset: $('.sticky-search').offset().top,
        requestMade: false,
        loader: '<div class="loader"><span class="loader-text"></span>Loading....</div>'
    };
    //ES5... will die. As will your friends. Good, I can feel your anger. I am defenseless. Take your weapon. Strike me down with all of your hatred and your journey towards the dark side will be complete!
    let PURPOSES = {'EVERYTHING': EverythingEvent, 'storageEvent': storageEvent};
    /**
     * Dictionary of companies. Unique name to value.
     * Each value contains a COMPANY detail which is described below.
     *
     * COMPANY detail is defined as follows:
     * {    name : String,
     *      applied : last date they applied via unix timestamp JS style || false,
     *      visited : last date they visited via unix timestamp JS style || false
     * }
     */
    let COMPANIES = {};
    window.addEventListener('message', function(event){
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
    function addVisitedToStorage(data) {
        window.postMessage({purpose: 'addVisited', data: data}, "*");
    }
    function addAppliedToStorage(data) {
        window.postMessage({purpose: 'addApplied', data: data}, "*");
    }
    function storageEvent(data) {
        //update internal state
        return false;
    }
    function getEverythingFromStorage() {
        window.postMessage({purpose: 'EVERYTHING'}, "*");
    }
    function EverythingEvent(data) {
        //overwrite state and just get it on
        COMPANIES = {};
        //Parse data into state using the COMPANY detail format
        for (let item of data) {
            if (!('name' in item)) continue; // really need an error here because this is actually invalid data
            addCompanyToCompanies(item);
        }
        restyleExistingElements();
    }
    function addCompanyToCompanies(data){
        if (!data || data === null || data === undefined || !('name' in data)) return false;
        //Make sure the name is lowercase
        data.name = data.name.toLowerCase();
        let detail = {name: data.name};
        detail.applied = false;
        detail.visited = false;
        if (data.name in COMPANIES) {
            detail.applied = COMPANIES[data.name].applied;
            detail.visited = COMPANIES[data.name].visited;
        }
        if ('action' in data && (data.action === 'applied' || data.action === 'visited') && 'date' in data) detail[data.action] = data.date;
        if ('applied' in data) detail.applied = returnGreaterDate(data.applied, detail.applied);
        if ('visited' in data) detail.visited = returnGreaterDate(data.visited, detail.visited);
        COMPANIES[data.name] = detail;
        return detail;
    }
    function returnGreaterDate(date1, date2) {
        if (date1 === false) {
            return date2;
        } else if (date2 === false) {
            return date1;
        } else {
            return date1 > date2 ? date1 : date2;
        }
    }
    //add a surrounding div with 'base' class to this.
    //This is the box used for adding a job spreadsheet file.
    var HTMLBox =
        '<div class="card-header"><h3>Ultra Advanced Search</h3></div>' +
        '<div class="card-content box search container">' +
        '<input type="file" id="bradlys-crunchbase-job-search-file" name="file">' +
        '</div>' +
        '<div class="card-content box container">' +
        '<input style="width:inherit;" id="bsh-job-search-on" type="checkbox" name="JOB_SEARCH_ON" value="JOB_SEARCH_ON" onclick="jobSearchModeToggle(this)"><span style="display:inline">Job Search Mode</span>'+
        '</div>';
    //used to parse CSV files; not yet implemented here.
    var papaParseScript = 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/4.1.2/papaparse.min.js';
    //used to parse xlsx files
    var xlsxScript = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.8.0/xlsx.full.min.js';
    var scripts = [xlsxScript];
    //different colors for different result types
    var resultColors = {
        'appliedRecently' : 'hsla(0, 65%, 70%, 0.5)',
        'appliedLongAgo' : 'hsla(110, 85%, 75%, 0.6)',
        'visitedRecently' : 'hsla(289, 75%, 35%, 0.8)'
    };
    var CURRENT_TIME = new Date();

    var SIXMONTHS = 180*1000*60*60*24;
    var DAYS_45 = 45*60*60*24*1000;

    /**
     * This is what is called upon scrolling. It will do a search if the state is setup correctly
     * and then append the results of the search to the page. What is different about this one
     * versus the crunchbase one is that this one stylizes the results as they are appended.
     *
     * @returns {boolean}
     */
    function bradlysCrunchbaseSearch() {
        if (bradlysTrack.finished === true || !CB.AdvancedSearch.hasSearch()) {
            return false;
        }
        var el = CB.responsive.el;
        var $window = $(window);
        var $documentHeight = el.$documentHeight() > 200 ? el.$documentHeight() - 50 : el.$documentHeight();
        if ((($window.scrollTop() + $window.outerHeight()) >= $documentHeight) && (bradlysTrack.requestMade === false)) {
            var cont = $('.results.container');
            cont.append(bradlysTrack.loader);
            CB.AdvancedSearch.query(true, function (success, callback) {
                var results = [];
                var result = [];
                var data = callback.hits;
                var place = $('.results ul');
                $(data).each(function (i) {
                    //var vR = visitedRecently(data[i]);
                    var temp = CB.Autocomplete.template(data[i]).trim();
                    var companyName = data[i].name;
                    var style = getStyleForCompany(companyName);
                    var wrap = '<li' + (style.length > 0 ? (' style="' + style + '"') : '') +
                        ' onclick="addToVisited(\'' + companyName + '\');"' +
                        ">" + temp + '</li>';
                    result.push(wrap);
                });
                place.append(result);
                $('.loader').remove();
                return bradlysTrack.requestMade = false;
            }); // end makeAjaxRequest
            return bradlysTrack.requestMade = true;
        }
    }

    /**
     * Returns $text where <li style="$text"></li> is the correct style text for the company.
     * In the current case it styles the background or background-color.
     *
     * @param {string} name - company name
     * @returns {string} style
     */
    function getStyleForCompany(name) {
        var colors = [];
        appliedRecently(name) ? colors.push(resultColors.appliedRecently) : '';
        appliedLongAgo(name) ? colors.push(resultColors.appliedLongAgo) : '';
        visitedRecently(name) ? colors.push(resultColors.visitedRecently) : '';
        var style = '';
        if (colors.length === 1) {
            style = 'background-color: ' + colors[0] + ';"';
        } else if (colors.length > 1) {
            style = 'background: linear-gradient(to right';
            for (var i in colors) {
                style += ', ' + colors[i];
            }
            style += ');"';
        }
        return style;
    }

    /**
     * Adds the company to the visited tracker and updates the copy visited button.
     *
     * @param {string} name - company name
     */
    window.addToVisited = function addToVisited(name) {
        if (!JOB_SEARCH_ON) return false;
        addVisitedToStorage({name: name});
    };

    window.jobSearchModeToggle = function jobSearchModeToggle(e) {
        JOB_SEARCH_ON = e.checked;
        restyleExistingElements();
    };

    /**
     * Has this company been applied to recently? Where recently is in the last six months.
     *
     * @param {string} name - company name
     * @returns {boolean}
     */
    function appliedRecently(name) {
        if (!name || name.length < 1){
            return false;
        }
        name = name.toLowerCase();
        if (name in COMPANIES) {
            if ('applied' in COMPANIES[name] && COMPANIES[name].applied !== false && CURRENT_TIME - COMPANIES[name].applied < SIXMONTHS) {
                return true;
            }
        }
        return false;
    }

    /**
     * Has this company been applied to long ago? Where long ago was at least six months ago.
     *
     * @param {string} name - company name
     * @returns {boolean}
     */
    function appliedLongAgo(name) {
        if (!name || name.length < 1){
            return false;
        }
        name = name.toLowerCase();
        if (name in COMPANIES) {
            if ('applied' in COMPANIES[name] && COMPANIES[name].applied !== false && CURRENT_TIME - COMPANIES[name].applied >= SIXMONTHS) {
                return true;
            }
        }
        return false;
    }

    /**
     * Has this company been visited recently? Where recently is in the last 45 days.
     *
     * @param {string} name - company name
     * @returns {boolean}
     */
    function visitedRecently(name) {
        if (!name || name.length < 1){
            return false;
        }
        name = name.toLowerCase();
        if (name in COMPANIES) {
            if ('visited' in COMPANIES[name] && COMPANIES[name].visited !== false && CURRENT_TIME - COMPANIES[name].visited < DAYS_45) {
                return true;
            }
        }
        return false;
    }

    /**
     * Load all dependency scripts for the program. That is, scripts that we need to run
     * this script. Dependency script src urls are stored in the scripts variable.
     *
     */
    function loadDependencyScripts() {
        for (var i in scripts) {
            var s = document.createElement('script');
            s.src = scripts[i];
            s.onload = function () {
                this.parentNode.removeChild(this);
            };
            (document.head || document.documentElement).appendChild(s);
        }
    }

    /**
     * Replace all window scrolling functions that exist with bradlysCrunchbaseSearch.
     *
     */
    function replaceWindowScroll() {
        $(window).scroll();
        $(window).unbind('scroll');
        $(window).scroll(function() {
            bradlysCrunchbaseSearch();
        });
    }

    /**
     * Insert the file box UI element into the page.
     *
     */
    function insertFileBox() {
        var searchElement = document.getElementsByClassName('base search');
        if(searchElement){
            var HTMLBoxElement = document.createElement('div');
            HTMLBoxElement.innerHTML = HTMLBox;
            HTMLBoxElement.className = 'base';
            HTMLBoxElement.querySelector('#bradlys-crunchbase-job-search-file').onchange = parseFileIntoState;
            searchElement[0].parentNode.insertBefore(HTMLBoxElement, searchElement[0]);
        } else {
            console.log("Couldn't find search element. I guess CrunchBase updated their UI. Tell Bradly.");
        }
    }

    /**
     * Restyle any existing <li> elements in the search results based upon our existing state.
     * This also adds the onclick addToVisited functionality. This is similar to as what it is done
     * in bradlysCrunchbaseSearch when elements are appended but now we can do it for elements that already exist.
     *
     */
    function restyleExistingElements() {
        var elements = document.getElementsByClassName('results container')[0];
        elements = elements.getElementsByTagName('li');
        for (var i = 0; i < elements.length; i++ ) {
            var name = elements[i].querySelector('.name').innerHTML.toLowerCase();
            if(JOB_SEARCH_ON) {
                //if name is in companies then stylize it
                if (name in COMPANIES) {
                    var style = getStyleForCompany(name);
                    if (style.length > 0) {
                        elements[i].setAttribute('style', style);
                    }
                }
                //regardless, make sure we add it to visited when clicked
                elements[i].setAttribute('onclick', 'addToVisited(\'' + name + '\');');
            } else {
                elements[i].removeAttribute('style');
                elements[i].removeAttribute('onclick');
            }
        }
    }

    /**
     * Take the file given from the file input element and parse it into state. After that's done,
     * replace the window scrolling function and restyle all existing elements.
     *
     * @param {event} e - event from input element
     * @returns {boolean}
     */
    function parseFileIntoState(e) {
        var files = e.target.files;
        if(files.length === 0){
            return false;
        }
        var file = files[0];
        var fileName = file.name;
        var fileExt = fileName.split('.');
        if(fileExt.length < 2){
            return false;
        }
        fileExt = fileExt[fileExt.length - 1].toLowerCase();
        if(fileExt === 'csv'){
            //Papa Parse
        } else if (fileExt === 'xlsx'){
            //js-xlsx script from github
            var fileReader = new FileReader();
            fileReader.onload = function(evt){
                if(evt.target.readyState != 2) return;
                if(evt.target.error) {
                    alert('Error while reading file');
                    return;
                }
                var data = evt.target.result;
                var workbook = XLSX.read(data, {type: 'binary'});
                //applied jobs sheet
                var worksheet = workbook.Sheets[workbook.SheetNames[0]];
                var companyColumn = 'A';
                var dateColumn = 'C';
                var companyRow = false;
                var dateRow = false;
                for (var j in worksheet) {
                    if (j === '!ref') {
                        continue;
                    }
                    if (worksheet[j].v === 'Company' && !companyRow) {
                        companyColumn = j.match(new RegExp('[a-zA-Z]+'))[0];
                        companyRow = j.match(new RegExp('\\d+'))[0];
                    } else if (worksheet[j].v.indexOf('Date') === 0 && !dateRow) {
                        dateColumn = j.match(new RegExp('[a-zA-Z]+'))[0];
                        dateRow = j.match(new RegExp('\\d+'))[0];
                    }
                    if (companyRow && dateRow) {
                        break;
                    }
                }
                //companies to push to storage
                let companiesPushToStorage = [];
                for (j in worksheet) {
                    if (j === '!ref') {
                        continue;
                    }
                    var currentColumn = j.match(new RegExp('[a-zA-Z]+'))[0];
                    var currentRow = j.match(new RegExp('\\d+'))[0];
                    if (currentColumn !== companyColumn || parseInt(currentRow) <= parseInt(companyRow)) {
                        continue;
                    }
                    var companyName = worksheet[j].v.toLowerCase();
                    var appliedDate = worksheet[dateColumn+currentRow];
                    if (appliedDate && 'w' in appliedDate) {
                        appliedDate = appliedDate.w;
                        appliedDate = new Date(appliedDate);
                    }
                    //local storage
                    let detail = {};
                    detail.date = appliedDate;
                    detail.name = companyName;
                    companiesPushToStorage.push(detail);
                    detail.applied = appliedDate;
                    addCompanyToCompanies(detail);
                }
                //push companies to storage if there are any
                if (companiesPushToStorage.length > 0) addAppliedToStorage(companiesPushToStorage);
                //visited companies sheet
                worksheet = workbook.Sheets[workbook.SheetNames[1]];
                companyColumn = 'A';
                dateColumn = 'C';
                companyRow = false;
                dateRow = false;
                for (var j in worksheet) {
                    if (j === '!ref') {
                        continue;
                    }
                    if (worksheet[j].v === 'Company' && !companyRow) {
                        companyColumn = j.match(new RegExp('[a-zA-Z]+'))[0];
                        companyRow = j.match(new RegExp('\\d+'))[0];
                    } else if (worksheet[j].v.indexOf('Date') === 0 && !dateRow) {
                        dateColumn = j.match(new RegExp('[a-zA-Z]+'))[0];
                        dateRow = j.match(new RegExp('\\d+'))[0];
                    }
                    if (companyRow && dateRow) {
                        break;
                    }
                }
                companiesPushToStorage = [];
                for (j in worksheet) {
                    if (j === '!ref') {
                        continue;
                    }
                    var currentColumn = j.match(new RegExp('[a-zA-Z]+'))[0];
                    var currentRow = j.match(new RegExp('\\d+'))[0];
                    if (currentColumn !== companyColumn || parseInt(currentRow) <= parseInt(companyRow)) {
                        continue;
                    }
                    var companyName = worksheet[j].v.toLowerCase();
                    var visitedDate = worksheet[dateColumn+currentRow];
                    if (visitedDate && 'w' in visitedDate) {
                        visitedDate = visitedDate.w;
                        visitedDate = new Date(visitedDate);
                    }
                    //local storage
                    let detail = {};
                    detail.date = visitedDate;
                    detail.name = companyName;
                    companiesPushToStorage.push(detail);
                    detail.visited = visitedDate;
                    addCompanyToCompanies(detail);
                }
                //push companies to storage if there are any
                if (companiesPushToStorage.length > 0) addVisitedToStorage(companiesPushToStorage);
                restyleExistingElements();
            };
            fileReader.readAsBinaryString(file);
        }
    }

    function init(){
        getEverythingFromStorage();

    }

    loadDependencyScripts();
    insertFileBox();
    replaceWindowScroll();
    init();

})();
