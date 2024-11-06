import React from 'react';
import { Accordion, Title } from '@mantine/core';

const AccordionControl = ({ children }) => (
  <Accordion.Control>
    <Title order={4}>{children}</Title>
  </Accordion.Control>
);

export default AccordionControl;
