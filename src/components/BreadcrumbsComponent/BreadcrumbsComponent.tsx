import { Breadcrumbs, Typography } from "@mui/material";
import { Link, useLocation } from "react-router-dom";

const BreadcrumbsComponent = () => {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  return (
    <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
      {/* Home Link */}
      <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
        Home
      </Link>

      {/* Always show Calculators if the user is on a calculator-related path */}
      {pathnames.includes("value-calculator") && (
        <Link
          to="/calculators"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          Calculators
        </Link>
      )}

      {/* Dynamic Breadcrumbs for Remaining Path */}
      {pathnames.map((value, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
        const isLast = index === pathnames.length - 1;
        return isLast ? (
          <Typography key={routeTo} color="textPrimary">
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </Typography>
        ) : (
          <Link
            key={routeTo}
            to={routeTo}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
};

export default BreadcrumbsComponent;
