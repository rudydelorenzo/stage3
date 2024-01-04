/* UPDATE 04-01-2024
* This webapp was built in 2021, therefore it's now woefully out of date.
* In order to allow for a demo-only version of this app to be deployed, data fetching has been disabled
* and therefore the numbers calculated will be meaningless.
*
* Regardless, all the original code remains (although commented) so one could follow the logic of the original
* if they so desired.
*
* The returned numbers will be set to placeholders as a showcase of this app's former glory
* */

const express = require("express");
const fs = require("fs");
const https = require("https");
const jsdom = require("jsdom");
const cron = require("node-cron");

const app = express();
const port = 3001;
const page_filename = "page.html";
const two_week_millis = 1209600 * 1000;
const ab_population = 3806860;
const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];


app.use(express.static('static'));

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

async function savePageToFile(url, file) {
    return new Promise((resolve) => {
        https.get(url, (res => {
            res.pipe(file);
            res.on('end', () => {
                resolve();
            });
        }));
    });
}

async function getNewData() {
    // Fetch page
    const file = fs.createWriteStream(page_filename);
    await savePageToFile("https://www.alberta.ca/stats/covid-19-alberta-statistics.htm", file);

    // Isolate graph
    let html = fs.readFileSync(page_filename);
    let document = new jsdom.JSDOM(html, { includeNodeLocations: true }).window.document.body;

    let captions = document.getElementsByClassName("caption")
    let script;
    for (let i = 0; i < captions.length; i++) {
        if (captions[i].innerHTML.includes("Number of COVID-19 vaccine doses administered by dose 1 and dose 2 and day")) {
            script = captions[i].parentElement.querySelector("script");
            break;
        }
    }

    if (script) {
        fs.writeFileSync("data.json", script.innerHTML);
    }

    let tables = document.getElementsByTagName("table");
    for (let i = 0; i < tables.length; i++) {
        try {
            if (tables[i].querySelector("thead > tr > th:nth-child(4)").innerHTML.includes("% of population with at least 1 dose")) {
                fs.writeFileSync("dose1.txt", tables[i].querySelector("tbody > tr:nth-child(20) > td:nth-child(4)").innerHTML.trim());
                fs.writeFileSync("dose2.txt", tables[i].querySelector("tbody > tr:nth-child(20) > td:nth-child(6)").innerHTML.trim());
                break;
            }
        } catch (e) {}
    }

    console.log(`${(new Date).toISOString()}: New Data Fetched`);
}

app.get("/data", (req, res) => {
    let data = JSON.parse(fs.readFileSync("data.json"));

    // item 1 contains data about fully vaccinated individuals, 0 contains single-dose data
    let data1dose = data.x.data[0];
    let data2dose = data.x.data[1];
    if (data1dose.name === "dose 1") {
        let current1 = parseFloat(fs.readFileSync("dose1.txt"));
        let newVaccinations1 = Math.round(data1dose.y[(data1dose.y.length)-1]);
        let rateOfChange1 = 0  // 7-day rolling average
        for (let i = (data1dose.y.length)-1; i > (data1dose.y.length)-8; i--) rateOfChange1 += data1dose.y[i];
        rateOfChange1 = (((rateOfChange1/7) / ab_population) * 100);
        let daysETA70 = Math.round((70 - current1) / rateOfChange1);

        let current2 = parseFloat(fs.readFileSync("dose2.txt"));
        let newVaccinations2 = Math.round(data2dose.y[(data2dose.y.length)-1]);

        let dateMillis = ((new Date()).getTime()) + ((daysETA70 * 86400) * 1000);
        let stage3Millis = dateMillis + two_week_millis;

        let date70Percent = new Date(dateMillis);
        let dateStage3 = new Date(stage3Millis);

        /* Original return statement
        responseData = {
            "single-dose": {
                "current-percent": current1,
                "new-vaccinations": numberWithCommas(newVaccinations1)
            },
            "two-doses": {
                "current-percent": current2,
                "new-vaccinations": numberWithCommas(newVaccinations2)
            },
            "date-70p": `${monthNames[date70Percent.getMonth()]} ${date70Percent.getDate()}, ${date70Percent.getFullYear()}`,
            "date-stage3": `${monthNames[dateStage3.getMonth()]} ${dateStage3.getDate()}, ${dateStage3.getFullYear()}`,
            "days-till-70p": daysETA70,
            "days-till-stage3": daysETA70 + 14
        }*/

        const responseData = {
            "single-dose": {
                "current-percent": current1,
                "new-vaccinations": numberWithCommas(newVaccinations1)
            },
            "two-doses": {
                "current-percent": current2,
                "new-vaccinations": numberWithCommas(newVaccinations2)
            },
            "date-70p": `${monthNames[5]} ${17}, ${2021}`,
            "date-stage3": `${monthNames[6]} ${1}, ${2021}`,
            "days-till-70p": daysETA70,
            "days-till-stage3": daysETA70 + 14
        }

        res.setHeader('Content-Type', 'application/json');
        res.json(responseData);
    }
})

app.listen(port, () => {
    console.log(`Stage3 Server listening on port ${port}`)
})


/* Fetch data on startup and on a set schedule */
// cron.schedule("*/30 * * * *", () => {
//     getNewData();
// });

// getNewData();

