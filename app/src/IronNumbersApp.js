import React from 'react';
import './IronNumbersApp.css';
import IronNumbersList from './IronNumbersList';
import SendIronNumber from './SendIronNumber';
import {Helmet} from "react-helmet";

class IronNumbersApp extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showlist: false,
            time: new Date().toLocaleTimeString(),
            reportAccepted: false,
        };
        this.handleClickSendButton = this.handleClickSendButton.bind(this);
        this.handleRefreshIronNumbersList = this.handleRefreshIronNumbersList.bind(this);
      }

    handleClickSendButton(phone) {
        this.setState({
            reportAccepted: false,
        });

        var xhttp = new XMLHttpRequest();
        xhttp.open("POST", "/api/ironnumber", true);
        xhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhttp.responseType = 'json';
        var reactComponent = this;
        xhttp.onreadystatechange = function() {
            if (xhttp.readyState === 4 && xhttp.status === 200){
                reactComponent.setState({
                    reportAccepted: true,
                });
            }
        }
        xhttp.send(JSON.stringify({
            pwd: "__Yhukho300",
            hikename: this.state.hikename,
            phone: phone,
        }));

        var password = phone.match(/\d{10}/);
        if (!password) {
            xhttp = new XMLHttpRequest();
            xhttp.open("PATCH", "/api/ironnumber?pwd=__Yhukho300&specialpwd="+phone+"&hikename="+this.state.hikename, true);
            xhttp.responseType = 'json';
            xhttp.onreadystatechange = function() {
                if (xhttp.readyState === 4 && xhttp.status === 200){
                    var data = xhttp.response;

                    reactComponent.setState({
                        password: phone,
                    });

                    reactComponent.setState({
                        showlist: true,
                    });
        
                    var header = [{
                        name: "שם:",
                        phone: "טלפון:",
                        withus: "איתנו:",
                        lastseen: "נראה לאחרונה:",
                        car: "רכב:",
                    }];
                    var joined = header.concat(data);

                    reactComponent.setState({
                        ironNumbersArray: joined,
                    });
                }
            }
            xhttp.send();
        }
    }

    handleRefreshIronNumbersList(event) {
        var reactComponent = this;
        var xhttp = new XMLHttpRequest();
        if (this.state && this.state.password) {
            var password = this.state.password;
        
            xhttp.open("PATCH", "/api/ironnumber?pwd=__Yhukho300&specialpwd="+password+"&hikename="+this.state.hikename, true);
            xhttp.responseType = 'json';
            xhttp.onreadystatechange = function() {
                if (xhttp.readyState === 4 && xhttp.status === 200){
                    var data = xhttp.response;
        
                    var header = [{
                        name: "שם:",
                        phone: "טלפון:",
                        withus: "איתנו:",
                        lastseen: "נראה לאחרונה:",
                        car: "רכב:",
                    }];
                    var joined = header.concat(data);

                    reactComponent.setState({
                        ironNumbersArray: joined,
                    });
                }
            }
            xhttp.send();
        }
        // event.preventDefault();
        // event.stopPropagation();
    }

    componentDidMount() {
        var reactComponent = this;
        var xhttp = new XMLHttpRequest();
        xhttp.open("GET", "/api/hike?pwd=__Yhukho300", true);
        xhttp.responseType = 'json';
        xhttp.onreadystatechange = function() {
            if (xhttp.readyState === 4 && xhttp.status === 200){
                var data = xhttp.response;

                if (data && data[0] && data[0].hikenamehebrew) {
                    reactComponent.setState({
                        hikename: data[0].hikenamehebrew,
                    });
                }
            }
        }
        xhttp.send();
    }

    renderIronNumbersList() {
        if (this.state.showlist === true) {
            return (<IronNumbersList 
                        onRefreshIronNumbersList={this.handleRefreshIronNumbersList} 
                        list={this.state.ironNumbersArray}/>);
        }
        else {
            return (<div></div>);
        }
    }
    
    render() {
      return (
        <div className="App" dir="rtl" direction="rtl">
            <Helmet>
                <title>מספרי ברזל</title>
                <link rel="apple-touch-icon" sizes="57x57" href="/apple-icon-57x57.png"/>
                <link rel="apple-touch-icon" sizes="60x60" href="/apple-icon-60x60.png"/>
                <link rel="apple-touch-icon" sizes="72x72" href="/apple-icon-72x72.png"/>
                <link rel="apple-touch-icon" sizes="76x76" href="/apple-icon-76x76.png"/>
                <link rel="apple-touch-icon" sizes="114x114" href="/apple-icon-114x114.png"/>
                <link rel="apple-touch-icon" sizes="120x120" href="/apple-icon-120x120.png"/>
                <link rel="apple-touch-icon" sizes="144x144" href="/apple-icon-144x144.png"/>
                <link rel="apple-touch-icon" sizes="152x152" href="/apple-icon-152x152.png"/>
                <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon-180x180.png"/>
                <link rel="icon" type="image/png" sizes="192x192"  href="/android-icon-192x192.png"/>
                <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"/>
                <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png"/>
                <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png"/>
                <link rel="manifest" href="/manifest.json"/>
                <meta name="msapplication-TileColor" content="#ffffff"/>
                <meta name="msapplication-TileImage" content="/ms-icon-144x144.png"/>
                <meta name="theme-color" content="#ffffff"/>
            </Helmet>
            <h1>
                {this.state.hikename}
                <br/>
                עכשיו השעה {this.state.time}
            </h1>
            <h2>
                אני נוכח:
            </h2>
            <SendIronNumber 
                reportAccepted={this.state.reportAccepted} 
                onClickSendButton={(phone) => this.handleClickSendButton(phone)}/>
            {this.renderIronNumbersList()}
        </div>
      );
    }
  }

export default IronNumbersApp;
