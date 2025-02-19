"use client";

import { ComboBox } from "@/ui/components/forms/ComboBox";
import { Button, Input } from "@nextui-org/react";
import { Form, Formik } from "formik";

export default function CreateDockerPage() {
  return (
    <div className="flex flex-col">
      <h3>Crear nueva aplicación de Github</h3>
      <div className="flex flex-col gap-8 mt-8">
        <Formik>
          {({handleSubmit, isValid}) => (
            <Form>
              <Input
                label="Imagen de docker"
                placeholder="traefik, nginx, etc..."
              />
              <Input label="Versión" placeholder="vX.X.X" />
              <Button
                isLoading={loading}
                onClick={() => handleSubmit()}
                color="primary"
                className="self-start"
                isDisabled={!isValid}
              >
                Crear aplicación
              </Button>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}
