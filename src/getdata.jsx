import React from 'react'
import { useLocation } from "react-router-dom";

const getdata = () => {
     const location = useLocation();
     console.log("Query string:", location.search); 
  return (
    <div>
       

    </div>
  )
}

export default getdata
