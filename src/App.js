/* eslint-disable react-hooks/exhaustive-deps */
import './App.css';
import NameInput from './components/NameInput';
import { useState, useEffect } from 'react';
import { gapi } from "gapi-script";

function App() {
  const [calID, setCalID] = useState("");
  const [eventsPartner, setEventsPartner] = useState([]);
  const [eventsSelf, setEventsSelf] = useState([]);
  const [busyPartner, setBusyPartner] = useState([]);
  const [busySelf, setBusySelf] = useState([]);
  const [findBusy, setFindBusy] = useState(false);
  const [date1, setDate1] = useState(null);
  const [date2, setDate2] = useState(null);
  var tokenClient = null;

  const CLIENT_ID = process.env.REACT_APP_CLIENT_ID;
  const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
  const SCOPES = 'https://www.googleapis.com/auth/calendar.events.owned https://www.googleapis.com/auth/calendar.events.public.readonly https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.readonly';
  const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: async (resp) => {
      if (resp.error !== undefined) {
        throw (resp);
      }
    },
  });

  const authClick = () => {
    function initiate() {
      gapi.client
        .init({
          apiKey: API_KEY,
          discoveryDocs: [DISCOVERY_DOC],
        })
        .then(() => {
          if (gapi.client.getToken() === null) {
            // Prompt the user to select a Google Account and ask for consent to share their data
            // when establishing a new session.
            tokenClient.requestAccessToken({ prompt: 'consent' });
          }
        });
    }
    gapi.load("client", initiate);
  }

  const getEventsPartner = (apiKey) => {
    return gapi.client.request({
      path: `https://www.googleapis.com/calendar/v3/calendars/${calID}/events?timeMax=` + encodeURIComponent(date2.toISOString()) + '&timeMin=' + encodeURIComponent(date1.toISOString()),
    })
      .then(
        (response) => {
          let events = response.result.items.map(({ summary, start, end }) => ({ summary, start, end }));
          setEventsPartner(events);
        },
        function (err) {
          return [false, err];
        }
      );
  };

  const getEventsSelf = (apiKey) => {
    return gapi.client.request({
      path: `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMax=` + encodeURIComponent(date2.toISOString()) + '&timeMin=' + encodeURIComponent(date1.toISOString()),
      Authorization: `Bearer ${gapi.client.getToken().access_token}`
    })
      .then(
        (response) => {
          let events = response.result.items.map(({ summary, start, end }) => ({ summary, start, end }));
          setEventsSelf(events);
        },
        function (err) {
          return [false, err];
        }
      );
  };

  useEffect(() => {
    if (calID !== "") {
      const events = getEventsPartner(API_KEY);
      setEventsPartner(events);
    }
  }, [calID]);

  useEffect(() => {
    if (calID !== "") {
      const events = getEventsSelf(API_KEY);
      setEventsSelf(events);
    }
  }, [calID]);


  const formSubmitted = (email) => {
    console.log(email);
    var tmr = new Date();
    tmr.setDate(tmr.getDate() + 1)
    setDate1(new Date());
    setDate2(tmr);
    setCalID(email);
    // console.log(eventsPartner); 
    // console.log(eventsSelf);
    // console.log("done");
    var freeLunch = checkForLunch();
    while (!freeLunch) {
      setDate1(tmr);
      tmr.setDate(tmr.getDate() + 1)
      setDate2(tmr);
      setCalID(calID);
      freeLunch = checkForLunch();
    }
    console.log("Both are free for lunch!");
    setFindBusy(true);
    // Now that we've found when they're free and when they're busy
    // Merge the two
    mergeBusy();
  }

  const checkForLunch = () => {
    if (eventsPartner.find(e => e.summary.includes('lunch'))) {
      return false;
    }
    if (eventsSelf.find(e => e.summary.includes('lunch'))) {
      return false;
    }
    return true;
  };

  const freeBusySelf = () => {
    // get self's free-busy schedule
    return gapi.client.request({
      path: `https://www.googleapis.com/calendar/v3/freeBusy`,
      method: "POST",
      Authorization: `Bearer ${gapi.client.getToken().access_token}`,
      body: {
        "timeMin": date1.toISOString(),
        "timeMax": date2.toISOString(),
        "items": [
          {
            "id": "primary"
          }
        ]
      }
    })
      .then(
        (response) => {
          let busy = response.result.calendars.primary.busy
          setBusySelf(busy);
        },
        function (err) {
          return [false, err];
        }
      );
  };

  const freeBusyPartner = () => {
    // get partner's free-busy schedule
    return gapi.client.request({
      path: `https://www.googleapis.com/calendar/v3/freeBusy`,
      method: "POST",
      body: {
        "timeMin": date1.toISOString(),
        "timeMax": date2.toISOString(),
        "items": [
          {
            "id": calID
          }
        ]
      }
    })
      .then(
        (response) => {
          let busy = response.result.calendars[calID].busy;
          setBusyPartner(busy);
        },
        function (err) {
          return [false, err];
        }
      );
  };

  useEffect(() => {
    if (findBusy) {
      const selfBusy = freeBusySelf();
      setBusySelf(selfBusy);
    }
  }, [findBusy]);

  useEffect(() => {
    if (findBusy) {
      const partnerBusy = freeBusyPartner();
      setBusyPartner(partnerBusy);
    }
  }, [findBusy]);


  const mergeBusy = () => {
    // First convert to normal JS dates
    var parsed = [];
    parsed.push([-1, Date.parse(date1)]);
    parsed.push([Date.parse(date2), Date.parse(date2)]);
    busySelf.forEach(({ start, end }) => { parsed.push([Date.parse(start), Date.parse(end)]) });
    busyPartner.forEach(({ start, end }) => { parsed.push([Date.parse(start), Date.parse(end)]) });
    parsed.sort(function (a, b) { return a[0] - b[0] });
    var index = 1;
    for (let i = 0; i < parsed.length; i = i + 1) {
      // If this is not first Interval and overlaps
      // with the previous one, Merge previous and current
      if (parsed[index][1] >= parsed[i][0]) {
        parsed[index][1] = Math.max(parsed[index][1], parsed[i][1]);
      }
      else {
        index = index + 1;
        parsed[index] = parsed[i];
      }
    }
    console.log("merged", parsed);
    // Now we want to find a free interval!
    for (let iv = 0; iv < parsed.length - 1; iv = iv + 1) {
      if (parsed[iv + 1][0] - parsed[iv][1] >= 3600000) {
        //create a new calendar event
        console.log("creating new event!");
        var startDate = new Date(parsed[iv][0]);
        var endDate = new Date();
        endDate.setTime(endDate.getTime() + (60 * 60 * 1000));
        addEvent(startDate, endDate);
        return;
      }
    }
    // if nothing is found, repeat the calendar cycle
  };

  const addEvent = (startDate, endDate) => {
    var event = {
      summary: "Lunch with name",
      start: {
        dateTime: startDate.toISOString(),
        timeZone: "America/New_York",
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: "America/New_York",
      },
      attendees: [
        { email: calID },
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 10 },
        ],
      },
    };
    function initiate() {
      gapi.client
        .request({
          path: `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
          method: "POST",
          body: event,
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${gapi.client.getToken().access_token}`,
          },
        })
        .then(
          (response) => {
            return [true, response];
          },
          function (err) {
            console.log(err);
            return [false, err];
          }
        );
    }
    gapi.load("client", initiate);
  };


  return (
    <div className="App">
      <h1>hello</h1>
      <button onClick={() => { authClick() }}>auth</button>
      <NameInput formSubmit={formSubmitted}></NameInput>
      {/* <button onClick={() => { setCalID("nitya.agarwala.25@dartmouth.edu"); }}>Click 1</button> */}
      <button onClick={() => { console.log(eventsPartner); console.log(eventsSelf); console.log("selfBusy", busySelf); console.log("pBusy", busyPartner) }}>Click 2</button>
    </div>
  );
}

export default App;
