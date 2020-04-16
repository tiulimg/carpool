import React from 'react';
import './SendIronNumber.css';

class SendIronNumber extends React.Component {
    renderReportAcceptance() {
        if (this.props.reportAccepted) {
            return (<div>קבלתי את הדיווח, תודה!</div>);
        }
        else {
            return (<div></div>);
        }
    }

    handleChangePhone(e) {
        this.setState({
            phone: e.target.value,
        });
    }

    handleClickSendButton() {
        if (this.state && this.state.phone) {
            this.props.onClickSendButton(this.state.phone);
        }
    }

    render() {
      return (
        <div className="send-ironnumber">
            <input 
                className="input-name" 
                type="text" 
                placeholder="שם" />
            <br/>
            <input 
                className="input-phone" 
                type="text" 
                placeholder="מספר טלפון" 
                onChange={(e)=>this.handleChangePhone(e)}/>
            <br/>
            <button 
                className="button-send" 
                onClick={()=>this.handleClickSendButton()}>שלח</button>
            {this.renderReportAcceptance()}
        </div>
      );
    }
  }

export default SendIronNumber;
