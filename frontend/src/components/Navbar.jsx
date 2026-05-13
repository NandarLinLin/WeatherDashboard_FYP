/* Author: Nandar Lin */

import { useState } from 'react'
import { Link as RouterLink, NavLink, useLocation, useNavigate } from 'react-router-dom'
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined'
import MenuIcon from '@mui/icons-material/Menu'
import SearchIcon from '@mui/icons-material/Search'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'

import weatherwiseLogoIcon from '../assets/weatherwise_logo_icon.png'
import { useAuth } from '../context/useAuth.js'

const NAV_ITEMS = [
  { label: 'DASHBOARD', href: '/dashboard' },
  { label: 'ANALYTICS', href: '/analytics' },
  { label: 'FAVORITES', href: '/favorites' },
]

const AUTH_ACTIONS = [
  { label: 'Login', href: '/login' },
  { label: 'Register', href: '/register' },
]

const USER_MENU_ITEMS = [{ label: 'Settings', href: '/settings', icon: SettingsOutlinedIcon }]

const PROTECTED_ROUTES = new Set(['/analytics', '/favorites'])

export default function Navbar({ isLoggedIn = false }) {
  const theme = useTheme()
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'))
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [navbarSearch, setNavbarSearch] = useState('')
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState(null)
  const isUserMenuOpen = Boolean(userMenuAnchorEl)

  const displayName = user?.fullName?.trim() || user?.email?.trim() || 'Account'

  const resolveNavTarget = (href) => {
    if (!isLoggedIn && PROTECTED_ROUTES.has(href)) {
      return { href: '/register', state: { from: href } }
    }

    return { href, state: undefined }
  }

  const handleNavAttempt = (event, href) => {
    if (!isLoggedIn && PROTECTED_ROUTES.has(href)) {
      event.preventDefault()
      navigate('/register', { replace: true, state: { from: href } })
      setMobileOpen(false)
      setUserMenuAnchorEl(null)
    }
  }

  const openUserMenu = (event) => {
    setUserMenuAnchorEl(event.currentTarget)
  }

  const closeUserMenu = () => {
    setUserMenuAnchorEl(null)
  }

  const handleLogout = () => {
    logout()
    closeUserMenu()
    setMobileOpen(false)
    navigate('/', { replace: true })
  }

  /** Matches LandingPage: Enter loads dashboard with `initialCity` (see DashboardPage location.state). */
  const handleNavbarSearchKeyDown = (event) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const trimmed = navbarSearch.trim()
    if (!trimmed) return
    if (mobileOpen) setMobileOpen(false)
    navigate('/dashboard', { state: { initialCity: trimmed } })
  }

  const drawerItems = (
    <Box sx={{ width: 280 }} role="presentation" onClick={() => setMobileOpen(false)}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', px: 2, py: 2 }}>
        <Box
          component="img"
          src={weatherwiseLogoIcon}
          alt="WeatherWise"
          sx={{
            height: 48,
            width: 48,
            objectFit: 'contain',
            display: 'block',
            flexShrink: 0,
          }}
        />
        <Typography
          variant="h6"
          component="span"
          sx={{
            fontSize: '1.5rem',
            fontWeight: 700,
            lineHeight: 1,
            m: 0,
          }}
        >
          WeatherWise
        </Typography>
      </Box>
      <Divider />
      <Box
        sx={{ px: 2, pt: 1.5, pb: 0 }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <TextField
          size="small"
          fullWidth
          placeholder="Search city..."
          variant="outlined"
          value={navbarSearch}
          onChange={(e) => setNavbarSearch(e.target.value)}
          onKeyDown={handleNavbarSearchKeyDown}
          aria-label="Search city"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ opacity: 0.85 }} />
              </InputAdornment>
            ),
          }}
          sx={(theme) => ({
            mb: 2,
            '& .MuiOutlinedInput-root': {
              color: theme.palette.mode === 'dark' ? '#fff' : theme.palette.text.primary,
              backgroundColor:
                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
              borderRadius: 2,
              minHeight: 48,
              py: 0.25,
              '& fieldset': {
                borderColor:
                  theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.22)' : theme.palette.divider,
              },
              '&:hover fieldset': {
                borderColor:
                  theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.35)' : theme.palette.text.secondary,
              },
              '&.Mui-focused fieldset': {
                borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : theme.palette.primary.main,
              },
            },
            '& .MuiInputBase-input': {
              py: 1.25,
              fontSize: '1rem',
            },
            '& .MuiInputAdornment-root .MuiSvgIcon-root': {
              color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : theme.palette.action.active,
            },
          })}
        />
      </Box>
      <List>
        {NAV_ITEMS.map((item) => {
          const target = resolveNavTarget(item.href)

          return (
            <ListItem key={item.label} disablePadding>
              <ListItemButton
                component={RouterLink}
                to={target.href}
                state={target.state}
                onClick={(event) => handleNavAttempt(event, item.href)}
                selected={location.pathname === item.href}
                sx={{
                  '&.Mui-selected': {
                    bgcolor: 'action.selected',
                  },
                }}
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          )
        })}
        <Divider sx={{ my: 1 }} />
        {!isLoggedIn
          ? AUTH_ACTIONS.map((item) => (
              <ListItem key={item.label} disablePadding>
                <ListItemButton component={RouterLink} to={item.href}>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))
          : [
              <ListItem key="settings" disablePadding>
                <ListItemButton component={RouterLink} to="/settings">
                  <ListItemText primary="Settings" />
                </ListItemButton>
              </ListItem>,
              <ListItem key="logout" disablePadding>
                <ListItemButton onClick={handleLogout}>
                  <ListItemText primary="Logout" />
                </ListItemButton>
              </ListItem>,
            ]}
      </List>
    </Box>
  )

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          color: 'text.primary',
        }}
      >
        <Container
          maxWidth={false}
          disableGutters
          sx={{
            px: { xs: 2, md: 4 },
          }}
        >
          <Toolbar
            disableGutters
            sx={{
              minHeight: { xs: 64, md: 76 },
              alignItems: 'center',
              justifyContent: { xs: 'space-between', md: 'unset' },
              display: { xs: 'flex', md: 'grid' },
              gridTemplateColumns: { md: '1fr auto 1fr' },
              columnGap: { md: 2 },
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ justifySelf: { md: 'start' } }}>
              {!isMdUp && (
                <IconButton
                  aria-label="Open menu"
                  onClick={() => setMobileOpen(true)}
                  edge="start"
                  size="large"
                  sx={{ mr: 0.5 }}
                >
                  <MenuIcon />
                </IconButton>
              )}

              <Box
                component={RouterLink}
                to="/"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  textDecoration: 'none',
                  color: 'inherit',
                  flexShrink: 0,
                  minWidth: 0,
                }}
              >
                <Box
                  component="img"
                  src={weatherwiseLogoIcon}
                  alt="WeatherWise"
                  sx={{
                    height: { xs: 40, sm: 48 },
                    width: { xs: 40, sm: 48 },
                    objectFit: 'contain',
                    display: 'block',
                    flexShrink: 0,
                  }}
                />
                <Typography
                  variant="h6"
                  component="span"
                  sx={{
                    fontSize: { xs: '1.25rem', sm: '1.5rem' },
                    fontWeight: 700,
                    letterSpacing: -0.3,
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                    m: 0,
                  }}
                >
                  WeatherWise
                </Typography>
              </Box>
            </Stack>

            {isMdUp ? (
              <Stack direction="row" alignItems="center" sx={{ justifySelf: 'center' }}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  {NAV_ITEMS.map((item) => {
                    const target = resolveNavTarget(item.href)

                    return (
                      <Button
                        key={item.label}
                        component={NavLink}
                        to={target.href}
                        state={target.state}
                        onClick={(event) => handleNavAttempt(event, item.href)}
                        color="inherit"
                        sx={{
                          fontWeight: 800,
                          letterSpacing: 0.8,
                          textTransform: 'uppercase',
                          py: 1,
                          minHeight: 44,
                          borderRadius: 999,
                          '&.active': {
                            bgcolor: 'action.selected',
                          },
                        }}
                      >
                        {item.label}
                      </Button>
                    )
                  })}
                </Stack>
              </Stack>
            ) : null}

            <Stack
              direction="row"
              alignItems="center"
              gap={{ xs: 2, md: 2.5 }}
              flexWrap={{ xs: 'wrap', sm: 'nowrap' }}
              sx={{ justifySelf: { md: 'end' }, justifyContent: { xs: 'flex-end', md: 'unset' }, minWidth: 0 }}
            >
              <TextField
                value={navbarSearch}
                onChange={(e) => setNavbarSearch(e.target.value)}
                onKeyDown={handleNavbarSearchKeyDown}
                placeholder="Search city..."
                size="small"
                aria-label="Search city"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  display: { xs: 'none', md: 'block' },
                  width: { md: 240 },
                  minWidth: { md: 200 },
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 999,
                    bgcolor: 'background.default',
                    height: 44,
                  },
                }}
              />

              {!isLoggedIn ? (
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexShrink: 0 }}>
                  <Button component={RouterLink} to="/login" variant="text" color="inherit" sx={{ fontWeight: 800 }}>
                    LOGIN
                  </Button>
                  <Button
                    component={RouterLink}
                    to="/register"
                    variant="contained"
                    disableElevation
                    sx={{
                      fontWeight: 900,
                      borderRadius: 999,
                      px: 2,
                      bgcolor: 'text.primary',
                      color: 'background.paper',
                      '&:hover': { bgcolor: 'text.primary' },
                    }}
                  >
                    REGISTER
                  </Button>
                </Stack>
              ) : (
                <>
                  <Button
                    onClick={openUserMenu}
                    variant="text"
                    color="inherit"
                    sx={{
                      borderRadius: 999,
                      px: 1.25,
                      minHeight: 44,
                      textTransform: 'none',
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                    aria-label="Open user menu"
                    aria-controls={isUserMenuOpen ? 'navbar-user-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={isUserMenuOpen ? 'true' : undefined}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Avatar src={user?.profilePicturePath || undefined} sx={{ width: 28, height: 28 }}>
                        {!user?.profilePicturePath ? (
                          <AccountCircleOutlinedIcon sx={{ width: 22, height: 22 }} />
                        ) : null}
                      </Avatar>
                      <Typography sx={{ fontWeight: 800, display: { xs: 'none', sm: 'block' } }}>
                        {displayName}
                      </Typography>
                    </Stack>
                  </Button>

                  <Menu
                    id="navbar-user-menu"
                    anchorEl={userMenuAnchorEl}
                    open={isUserMenuOpen}
                    onClose={closeUserMenu}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    PaperProps={{ sx: { mt: 0.75, borderRadius: '14px', minWidth: 180 } }}
                  >
                    {USER_MENU_ITEMS.map((item) => {
                      const ItemIcon = item.icon

                      return (
                        <MenuItem key={item.label} component={RouterLink} to={item.href} onClick={closeUserMenu}>
                          <ListItemIcon>
                            <ItemIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText>{item.label}</ListItemText>
                        </MenuItem>
                      )
                    })}
                    <MenuItem onClick={handleLogout}>
                      <ListItemText>Logout</ListItemText>
                    </MenuItem>
                  </Menu>
                </>
              )}
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)}>
        {drawerItems}
      </Drawer>
    </>
  )
}

