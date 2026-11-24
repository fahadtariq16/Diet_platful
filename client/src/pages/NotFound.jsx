import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="wrap page empty-state">
      <h1>Nothing on this plate.</h1>
      <p>The page you're looking for doesn't exist.</p>
      <Link className="btn btn-primary" to="/">Go to the home page</Link>
    </div>
  );
}
