import { Link } from "react-router"

const Navbar = () => {
  return (
    <nav className="navbar">
      <Link to="/">
       <p className="text-2xl font-bold text-gradient">RESUMIND</p>
      </Link>
      <Link to='/upload'className="primary-button w-fit">
        <p className="text-xl font-semibold">Upload resume</p>
      </Link>
    </nav>
  )
}

export default Navbar