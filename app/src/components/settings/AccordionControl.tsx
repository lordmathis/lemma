import React from 'react';
import { Accordion, Title } from '@mantine/core';

interface AccordionControlProps {
  children: React.ReactNode;
}

const AccordionControl: React.FC<AccordionControlProps> = ({ children }) => (
  <Accordion.Control>
    <Title order={4}>{children}</Title>
  </Accordion.Control>
);

export default AccordionControl;
