import React, { useState, useEffect } from "react";
import { Selector } from './components/Selector';
import Box from "@mui/material/Box";
import { Button, Divider, Alert, CircularProgress } from "@mui/material";
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Typography from "@mui/material/Typography";
import Grid from '@mui/material/Grid2';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';

import { Login } from "./components/Login";
import { ThemeProvider } from "@mui/material";
import theme from "./theme";
// import { Header } from './components/Header';

export const Popup = () => {
  const [modules, setModules] = useState([])
  const [user, setUser] = useState("")
  const [selected, setSelected] = useState('');
  const [clipped, setClipped] = useState('')
  const [isSuccess, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [link, setLink] = useState('')
  const [isLoading, setLoading] = useState(false)

  const handleChange = (event: SelectChangeEvent) => {
    setError('')
    setSuccess('')
    setSelected(event.target.value);
  };

  function saveContent() {
    setLoading(true)
    browser.runtime.sendMessage({type: "add_content", data: {user: user, content: clipped, module: selected}})
    .then(response => {
      console.log(response)
      if (response?.success) {
        console.log('Success')
        setSuccess(true)
        setLink(response.link)
        setLoading(false)
      } else {
        setSuccess(false)
        setError(response?.error)
        setLoading(false)
        console.log('Failure')
      }
    })
  }

  function openLink() {
    browser.tabs.update({
      url: link
    })
  }

  document.addEventListener('DOMContentLoaded', async(event) => {
    const syncData = await browser.storage.sync.get("uid")
    const uid = syncData?.uid
    
    setUser(uid);
    if (uid) {
      browser.storage.session.get("modules").then((result) => {
        if (result && result.length > 0) {
          console.log(result)
        } else {
          browser.runtime.sendMessage({ type: 'popup_open', data: {user: uid} })
          .then(response => {
            console.log('Response in popup', response, response.checked)
            if (response.success) {
              setModules(response.response.modules)
              browser.storage.session.set({"modules": response.response.modules})
            }
          })
        }

        browser.tabs.query({active: true, currentWindow: true})
        .then(tabs => {
            let currentTab = tabs[0];
            let currentUrl = currentTab.url;
            
            if (currentUrl.includes('x.com') && currentUrl.includes('status')) {
              browser.storage.local.get("tweetInfo").then((result) => {
                console.log('Tweet Info', result)
                if ("tweetInfo" in result) {
                  let tweetInfo = JSON.parse(result.tweetInfo)
                  tweetInfo = tweetInfo.join('\n')
                  setClipped(tweetInfo)
                }
              })
            }
        });


        browser.storage.local.get("clipped").then((result) => {
          console.log(result)
          if ("clipped" in result) {
            setClipped(result['clipped'])
          }
        })
      })
    } else {
      console.log("No user")
    }
  });




  return (
    <ThemeProvider theme={theme}>
        {
          user ? (
            <Grid container direction="column" spacing={1} alignItems="center">
                <Grid size={11} sx={{m: 1}}>
                  <Typography variant="body1">
                    <strong>
                      CLIPPED TEXT
                    </strong>
                  </Typography>
                  <Box sx={{backgroundColor: "#f2f2f2", p: 1, maxHeight: "150px", overflowY: "scroll"}}>
                    <Typography variant="body2">
                      {clipped}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={12}>
                  <Divider/>
                </Grid>
                <Grid size={12}>
                  <Grid container alignItems="center" justifyContent="space-around" spacing={1}>
                    <Grid size={2}>
                      <Typography variant="body2">
                        Add to
                      </Typography>
                    </Grid>
                    <Grid size={7}>
                      <FormControl sx={{ m: 1, width: "200px"}} size="small">
                        <Select
                          labelId="demo-select-small-label"
                          id="demo-select-small"
                          value={selected}
                          fullWidth
                          onChange={handleChange}
                        >
                          {
                            modules.map((module) => {
                              if (module) {
                                return (
                                  <MenuItem sx={{display: 'block'}} value={module.id}>
                                      <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {module.name}
                                      </div>
                                  </MenuItem>
                                )
                              }
                            })
                          }
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid size={12}>
                  <Divider/>
                </Grid>
                <Grid sx={{pl:1, pb: 1}} size={6}>
                  {
                    isLoading ? (
                      <Button fullWidth size="small" variant="contained" onClick={saveContent} disabled>
                        <CircularProgress size={20}/>
                      </Button>
                    ) : (
                      <Button fullWidth size="small" variant="contained" onClick={saveContent}>
                        Save Content
                      </Button>
                    )
                  }
                </Grid>
                {
                  isSuccess === true ? (
                    <Grid sx={{pl:1, pb: 1}}  size={6}>
                      <Button fullWidth variant="outlined" size="small" onClick={openLink}>
                        View updated module 
                      </Button>
                  </Grid> 
                  ) : isSuccess === false ? (
                    <Grid sx={{pl:1, pb: 1}}  size={8}>
                      <Alert severity="error">
                        {error}
                      </Alert>
                  </Grid>
                  ) : null
                }
            </Grid>
          ) : (
            <Box>
              <Login/>
            </Box>
          )
        }
    </ThemeProvider>
  )
};