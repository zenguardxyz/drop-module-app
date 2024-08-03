// src/components/FixedBackground.js
import React, { ReactNode, useState } from 'react';
import styled from 'styled-components';
import parachute1 from '../../assets/icons/drop-base.svg';
import parachute2 from '../../assets/icons/drop-eth.svg';
import parachute3 from '../../assets/icons/drop-usdc.svg'; // Add as many images as you have

interface BackgroundWrapperProps {
  children: ReactNode;
}

const BackgroundWrapper = styled.div`

  .parachute {
    position: absolute;
    width: 100px; /* Adjust width as needed */
    height: 100px; /* Adjust height as needed */
    background-size: contain;
    background-repeat: no-repeat;
  }

  .left {
    top: 50%;
    left: 20%;
    transform: translateY(-50%) rotate(15deg); /* Rotate the image by 15 degrees */
    background-image: url(${parachute1});
  }

  .top-right {
    top: 20%;
    right: 20%;
    transform: translateY(-50%) rotate(15deg); /* Rotate the image by 15 degrees */
    background-image: url(${parachute2});
  }

  .bottom-right {
    bottom: 20%;
    right: 20%;
    transform: translateY(-50%) rotate(-15deg); /* Rotate the image by 15 degrees */
    background-image: url(${parachute3});
  }
`;

const FixedBackground: React.FC<BackgroundWrapperProps> = ({ children }) => {

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  console.log(isMobile)

  return (
    <BackgroundWrapper>
      { !isMobile && <>
      <div className="parachute left" />
      <div className="parachute top-right" />
      <div className="parachute bottom-right" />
      </>
      }
      {children}
    </BackgroundWrapper>
  );
};

export default FixedBackground;