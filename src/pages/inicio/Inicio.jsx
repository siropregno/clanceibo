import React from 'react';
import { Helmet } from 'react-helmet-async';
import Banner from '@components/component-banner/banner';
import './inicio.css';
import Photogallery from '@components/component-photogallery/photogallery';

const Inicio = () => {
  return (
    <>
      <Helmet>
        <title>CLAN CEIBO | Inicio</title>
      </Helmet>
      <Banner />
      <Photogallery />
    </>
  )
};

export default Inicio;