const express = require("express");
const fs = require("fs");
const https = require("https");
const jsdom = require("jsdom");
const cron = require("node-cron");

const app = express();
const port = 3001;
const page_filename = "page.html";
const two_week_millis = 1209600 * 1000;
const ab_population = 4371000;
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
        if (captions[i].innerHTML.includes("Cumulative percent of individuals who received at least one dose or are fully vaccinated by day in Alberta")) {
            script = captions[i].parentElement.querySelector("script");
            break;
        }
    }
    fs.writeFileSync("data.json", script.innerHTML);

    console.log(`${(new Date).toISOString()}: New Data Fetched`);
}

app.get("/data", (req, res) => {
    let data = JSON.parse(fs.readFileSync("data.json"));

    // item 0 contains data about fully vaccinated individuals, 1 contains single-dose data
    let data1dose = data.x.data[1];
    let data2dose = data.x.data[0];
    if (data1dose.name === "Individuals who received at least one dose") {
        let current1 = data1dose.y[(data1dose.y.length)-1];
        let newVaccinations1 = Math.round(((current1 - data1dose.y[(data1dose.y.length)-2]) / 100) * ab_population);
        let rateOfChange1 = ((current1 - data1dose.y[(data1dose.y.length)-7]) / 7) // 7-day rolling average
        let daysETA70 = Math.round((70 - current1) / rateOfChange1);

        let current2 = data2dose.y[(data2dose.y.length)-1];
        let newVaccinations2 = Math.round(((current2 - data2dose.y[(data2dose.y.length)-2]) / 100) * ab_population);

        let dateMillis = ((new Date()).getTime()) + ((daysETA70 * 86400) * 1000);
        let stage3Millis = dateMillis + two_week_millis;

        let date70Percent = new Date(dateMillis);
        let dateStage3 = new Date(stage3Millis);

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
        }

        //console.log(responseData);
    }
    res.setHeader('Content-Type', 'application/json');
    res.json(responseData);
})

app.listen(port, () => {
    console.log(`Stage3 Server listening on port ${port}`)
})

cron.schedule("*/30 * * * *", () => {
    getNewData();
});

