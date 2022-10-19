import { useState } from 'react';

function NameInput(props) {

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);


  const handleNameChange = (event) => {
    setName(event.target.value);
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log("name submitted");
    console.log(email);
    props.formSubmit(email);
  }

  function isValidEmail(email) {
    return /\S+@\S+\.\S+/.test(email);
  }

  const handleEmailChange = event => {
    if (!isValidEmail(event.target.value)) {
      setError('Email is invalid');
    } else {
      setError(null);
    }

    setEmail(event.target.value);
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Name:
        <input type="text" value={name} onChange={handleNameChange} />
      </label>
      <label>
        Email:
        <input type="text" value={email} onChange={handleEmailChange} />
      </label>
      {error && <h2 style={{ color: 'red' }}>{error}</h2>}
      <input type="submit" value="Submit" />
    </form>
  )
}

export default NameInput;