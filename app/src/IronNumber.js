import React from 'react';
import './IronNumber.css';

class IronNumber extends React.Component {
    render() {
      return (
        <tr className={this.props.IronNumberClassNameColor}>
          <td className="iron-number-name">{this.props.name}</td>
          <td className="iron-number-phone">{this.props.phone}</td>
          <td className="iron-number-withus">{this.props.withus}</td>
          <td className="iron-number-lastseen">{this.props.lastseen}</td>
          <td className="iron-number-car">{this.props.car}</td>
        </tr>
      );
    }
  }

export default IronNumber;
