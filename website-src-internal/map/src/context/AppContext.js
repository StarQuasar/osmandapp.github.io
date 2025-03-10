import React, { useState, useEffect } from 'react';
import {
    Air, Cloud, Compress, Shower, Thermostat
} from '@mui/icons-material';
import useCookie from 'react-use-cookie';

const osmandTileURL = 'https://tile.osmand.net/hd/{z}/{x}/{y}.png';

function getWeatherUrl(layer) {
    // const urlWeatherPefix = '.';
    const urlWeatherPefix = 'https://test.osmand.net/weather/gfs';
    return urlWeatherPefix + '/tiles/' + layer + '/{time}/{z}/{x}/{y}.png';
}

function getLayers() {
    const layers = [
        { key: "temperature", name: "Temperature", opacity: 0.5, iconComponent: <Thermostat fontSize="small" /> },
        { key: "pressure", name: "Pressure", opacity: 0.6, iconComponent: <Compress fontSize="small" /> },
        { key: "wind", name: "Wind", opacity: 0.6, iconComponent: <Air fontSize="small" /> },
        { key: "cloud", name: "Cloud", opacity: 0.5, iconComponent: <Cloud fontSize="small" /> },
        { key: "precip", name: "Precipitation", opacity: 0.7, iconComponent: <Shower fontSize="small" /> },
    ];
    layers.map((item) => {
        item.url = getWeatherUrl(item.key);
        item.maxNativeZoom = 3;
        item.maxZoom = 11;
        item.checked = false;

        return item;
    });
    return layers;
}

let monthNames = {};
function evaluateMonthNames() {
    if (Object.keys(monthNames).length > 0) {
        return monthNames;
    }
    for(var i = 0; i < 12; i++ ) {
        var objDate = new Date();
        objDate.setDate(1);
        objDate.setMonth(i);
        monthNames[objDate.toLocaleString("en-us", { month: "short" })] = i + 1;
        monthNames[objDate.toLocaleString(window.navigator.userLanguage || window.navigator.language,
            { month: "short" })] = i + 1;
    }
    return monthNames;
    
}

export const getGpxTime = (f) => {
    if (f?.details?.analysis?.startTime) {
        return f.details.analysis.startTime;
    }
    let dt = f.name.match(/(20\d\d)-(\d\d)-(\d\d)/)
    if (!dt) {
        dt = f.name.match(/(20\d\d)(\d\d)(\d\d)/)
    }
    try {
        if (dt) {
            let date = new Date();
            date.setFullYear(parseInt(dt[1]));
            date.setMonth(parseInt(dt[2]) - 1);
            date.setDate(parseInt(dt[3]));
            return date.getTime();
        } else {
            dt = f.name.match(/(\d\d) (...) (20\d\d)/)
            if (dt) {
                let monthNames = evaluateMonthNames();
                if (monthNames[dt[2]]) {
                    let date = new Date();
                    date.setFullYear(parseInt(dt[3]));
                    date.setMonth(monthNames[dt[2]] - 1);
                    date.setDate(parseInt(dt[1]));
                    return date.getTime();
                }
            }
        }
    } catch (Error) {

    }
    return 0;
}

async function loadListFiles(loginUser, listFiles, setListFiles, setGpxLoading) {
    if (loginUser !== listFiles.loginUser) {
        if (!loginUser) {
            setListFiles({});
        } else {
            setGpxLoading(true);
            const response = await fetch(`/map/api/list-files`, {});
            const res = await response.json();
            res.loginUser = loginUser;
            res.uniqueFiles = res.uniqueFiles.sort((f, s) => {
                let ftime = getGpxTime(f);
                let stime = getGpxTime(s);
                if (ftime !== stime) {
                    return ftime > stime ? -1 : 1;
                }
                return 0;
            });
            setListFiles(res);
            setGpxLoading(false);
        }
    }
}
async function checkUserLogin(loginUser, setLoginUser, userEmail, setUserEmail, listFiles, setListFiles) {
    const response = await fetch(`/map/api/auth/info`, {
        method: 'GET'
    });
    if (response.ok) {
        const user = await response.json();
        let newUser = user && user.principal ? user.principal.username : null;
        if (loginUser !== newUser) {
            if (newUser) {
                setUserEmail(newUser, { days: 30 });
            }
            setLoginUser(newUser);
        }
    }
}

function getWeatherDate() {
    // // "20211222_0600"
    // let [searchParams, setSearchParams] = useSearchParams();
    const searchParams = new URLSearchParams(window.location.search);
    const weatherDateObj = new Date();
    if (searchParams.get("date")) {
        let weather_date = searchParams.get("date");
        weatherDateObj.setUTCFullYear(parseInt(weather_date.slice(0, 4)));
        weatherDateObj.setUTCMonth(parseInt(weather_date.slice(4, 6)) - 1);
        weatherDateObj.setUTCDate(parseInt(weather_date.slice(6, 8)));
        weatherDateObj.setUTCHours(parseInt(weather_date.slice(9, 11)));
    }
    weatherDateObj.setUTCMinutes(0);
    weatherDateObj.setUTCSeconds(0);
    return weatherDateObj;
}
// var originalDateObj = new Date(weatherDateObj);
const AppContext = React.createContext();

export const AppContextProvider = (props) => {
    const [weatherLayers, updateWeatherLayers] = useState(getLayers());
    const [weatherDate, setWeatherDate] = useState(getWeatherDate());
    const [gpxLoading, setGpxLoading] = useState(false);
    // cookie to store email logged in
    const [userEmail, setUserEmail] = useCookie('email', '');
    // server state of login
    const [loginUser, setLoginUser] = useState(null);
    const [listFiles, setListFiles] = useState({});
    const [gpxFiles, setGpxFiles] = useState({});
    
    useEffect(() => {
        checkUserLogin(loginUser, setLoginUser, userEmail, setUserEmail);
    // eslint-disable-next-line
    }, [loginUser]);
    useEffect(() => {
        loadListFiles(loginUser, listFiles, setListFiles, setGpxLoading);
    // eslint-disable-next-line
    }, [loginUser]);
    return <AppContext.Provider value={{
        weatherLayers: weatherLayers, updateWeatherLayers: updateWeatherLayers,
        weatherDate: weatherDate, setWeatherDate: setWeatherDate,
        userEmail: userEmail, setUserEmail: setUserEmail,
        listFiles: listFiles, setListFiles: setListFiles,
        loginUser: loginUser, setLoginUser: setLoginUser,
        gpxFiles: gpxFiles, setGpxFiles: setGpxFiles,
        gpxLoading: gpxLoading, setGpxLoading: setGpxLoading,
        tileURL: osmandTileURL
    }}>
        {props.children}
    </AppContext.Provider>;
};

export default AppContext;