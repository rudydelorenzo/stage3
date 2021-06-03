(async () => {
    let response = await fetch("/data");
    let data = await response.json();

    document.getElementById("main-date").innerHTML = `${data["date-stage3"].split(", ")[0]},`;
    document.getElementById("main-year").innerHTML = data["date-stage3"].split(", ")[1];
    document.getElementById("vac-yesterday").querySelector("h3").innerHTML = data["single-dose"]["new-vaccinations"];
    document.getElementById("1dose-percent").querySelector("h3").innerHTML = `${data["single-dose"]["current-percent"]}%`;
    document.getElementById("70p-date").querySelector("h3").innerHTML = data["date-70p"];
    document.getElementById("70p-eta").querySelector("h3").innerHTML = `${data["days-till-70p"]} days`;
    document.getElementById("stage3-eta").querySelector("h3").innerHTML = `${data["days-till-stage3"]} days`;
    document.getElementById("2dose-percent").querySelector("h3").innerHTML = `${data["two-doses"]["current-percent"]}%`;

    document.getElementsByClassName("pbutton")[0].addEventListener('click', (e) => {
        document.getElementsByClassName("small-data")[0].scrollIntoView();
    });

})();