import React from 'react';
import { Helmet } from 'react-helmet';
import Prox from '@components/component-prox/prox.jsx';
import './armory.css';

const Armory = () => {
  return (
    <>
      <Helmet>
        <title>UNIDAD | Equipamiento</title>
      </Helmet>
      <Prox />
    </>
  )
};

export default Armory;