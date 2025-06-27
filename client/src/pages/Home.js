import { Link, useNavigate } from "react-router-dom";
import '../styles/Home.css';

const Home = () => {
  const navigate = useNavigate();
  return (
    <div className="container">
      <div className="flex-container">
        <div className="text-container">
          <h1 className="welcome-text">
            Welcome login to Continue
          </h1>
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: '0.5rem', marginTop: '4rem', marginLeft: '30%' }}>
            <Link to="/login">
              <button className="continue-button">
                Continue
              </button>
            </Link>
            <button className="continue-button" onClick={() => {
              localStorage.removeItem('token');
              localStorage.setItem('trialUser', 'true');
              localStorage.setItem('trialStart', Date.now().toString());
              navigate('/dashboard/home');
            }}>
              Demo
            </button>
          </div>
        </div>

        <div className="images-container">
          <div className="image-wrapper">
            <img src="ui.png" alt="Docker" className="image" />
            <img src="unibee_vcard_qr.png" alt="Docker" className="image1" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home; /* Updated comment for landing page commit */
