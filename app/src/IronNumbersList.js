import React from 'react';
import IronNumber from './IronNumber';
import './IronNumbersList.css';

class IronNumbersList extends React.Component {
    renderIronNumbers() {
        if (this.props.list && this.props.list.length > 0) {
            return (this.props.list.map((currIronNumber) => {
                var color = "";
                if (currIronNumber.withus === "כן") {
                    color = "iron-number-green";
                }
                else if (currIronNumber.withus === "לא") {
                    color = "iron-number-red";
                }
                return (<IronNumber IronNumberClassNameColor={color}
                            name={currIronNumber.name} 
                            phone={currIronNumber.phone}
                            withus={currIronNumber.withus}
                            lastseen={currIronNumber.lastseen}
                            car={currIronNumber.car}/>);
            }));
        }
        else {
            return (<div></div>);
        }
    }
    
    render() {
      return (
        <div className="iron-numbers-list">
            <button onClick={(event) => this.props.onRefreshIronNumbersList(event)}>רענן</button>
            <br/>
            <table className="iron-numbers-table">
                {this.renderIronNumbers()}
            </table>
        </div>
      );
    }
  }

export default IronNumbersList;
