import { useNavigate } from "react-router-dom";
import { Box, Typography } from "@mui/material";

// Sample calculators data
const calculators = [
  {
    id: 1,
    name: "Value Calculator",
    path: "/value-calculator",
    image: "/icons/calculator.png",
  },
];

function Calculators() {
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <Box sx={{ padding: 3 }}>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 2, // Adds space between items
        }}
      >
        {calculators.map((calc) => (
          <>
            <Box
              key={calc.id}
              onClick={() => handleNavigation(calc.path)}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: "100px",
                height: "100px",
                borderRadius: "16px",
                backgroundColor: "#f5f5f5",
                boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
                cursor: "pointer",
                "&:hover": {
                  boxShadow: "0px 6px 15px rgba(0, 0, 0, 0.3)",
                  transform: "scale(1.05)",
                },
              }}
            >
              <img
                src={calc.image}
                alt={calc.name}
                style={{
                  width: "100%",
                  height: "100%",
                }}
              />
            </Box>
            <Typography variant="h6" align="center">
              {calc.name}
            </Typography>
          </>
        ))}
      </Box>
    </Box>
  );
}

export default Calculators;
