import { Suspense, useState } from "react";
import "./App.css";
import {
  useMediaQuery,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Box,
  CssBaseline,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
} from "@mui/material";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import MenuIcon from "@mui/icons-material/Menu";
import { useTheme } from "@mui/material/styles";
import Calculators from "./features/calculators/Calculators";
import BreadcrumbsComponent from "./components/BreadcrumbsComponent";
import PriceCalculator from "./components/PriceCalculator";

// Menu Items
const menuItems = [
  { text: "Dashboard", path: "/" },
  { text: "Calculators", path: "/calculators" },
];

const drawerWidth = 170;

const App = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const toggleDrawer = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawerContent = (
    <List>
      {menuItems.map(({ text, path }) => (
        <ListItem key={text} disablePadding>
          <ListItemButton
            component={Link}
            to={path}
            onClick={() => isMobile && toggleDrawer()}
            sx={{
              backgroundColor:
                location.pathname === path ? "#eeeeee" : "transparent",
              "&:hover": { backgroundColor: "#f5f5f5" },
            }}
          >
            <ListItemText primary={text} />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      {/* AppBar */}
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {isMobile && (
            <IconButton color="inherit" edge="start" onClick={toggleDrawer}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap>
            Pandit Jewellers
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={isMobile ? mobileOpen : true}
        onClose={toggleDrawer}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box" },
        }}
      >
        <Box sx={{ marginTop: "4rem" }}>{drawerContent}</Box>
      </Drawer>

      {/* Main Content Area */}
      <Box component="main" sx={{ flexGrow: 1, p: 1, mt: 8 }}>
        <BreadcrumbsComponent />
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/" element={<div>Dashboard</div>} />
            <Route path="/calculators" element={<Calculators />} />
            <Route path="/price-calculator" element={<PriceCalculator />} />
          </Routes>
        </Suspense>
      </Box>
    </Box>
  );
};

export default App;
