import { Button, Grid, Input, Loading, Text } from '@nextui-org/react';
import { trackGoal } from 'fathom-client';
import { useFormik } from 'formik';
import { useRouter } from 'next/router';
import * as yup from 'yup';
import { trackingGoals } from '../../constants';
import {
  useAppsQuery, useCreateAppDokkuMutation
} from '../../generated/graphql';
import { AdminLayout } from '../../ui/layout/layout';
import { useToast } from '../../ui/toast';

const CreateAppDokku = () => {
  const history = useRouter();
  const toast = useToast();
  const { data: dataApps } = useAppsQuery({
    variables: {
      limit: 1_000_000
    }
  });
  const [createAppDokkuMutation, { loading }] = useCreateAppDokkuMutation();

  const createAppSchema = yup.object().shape({
    name: yup
      .string()
      .required('Nombre de la app requerido')
      .matches(/^[a-z0-9-]+$/)
      .test(
        'El nombre ya existe',
        'Ya hay una aplicación con este nombre',
        (val) => !dataApps?.apps.items.find((app) => app.name === val)
      ),
  });

  const formik = useFormik<{
    name: string;
  }>({
    initialValues: {
      name: '',
    },

    validateOnChange: true,
    validationSchema: createAppSchema,
    onSubmit: async (values) => {
      try {
        const res = await createAppDokkuMutation({
          variables: {
            input: {
              name: values.name,
            },
          },
        });

        trackGoal(trackingGoals.createAppDokku, 0);

        if (res.data) {
          history.push(`app/${res.data?.createAppDokku.appId}`);
          toast.success('Aplicación creada');
        }
      } catch (error: any) {
        toast.error(error);
      }
    },
  });

  return (
    <AdminLayout>
      <Text h2>
        Crear aplicación nueva
      </Text>

      <Text className='mt-12 mb-8' >
        Escribe el nombre de la apicación y estará listo!
      </Text>

      <Grid.Container>
        <Grid>
          <form onSubmit={formik.handleSubmit}>
            <Input
              label='Nombre de la aplicación'
              autoComplete="off"
              id="name"
              name="name"
              placeholder="Nombre"
              value={formik.values.name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            <Text color='error'>{formik.errors.name}</Text>

            <div className='mt-4 flex justify-end'>
              <Button
                className='mt-8'
                type="submit"
                disabled={
                  loading || !formik.values.name || !!formik.errors.name
                }
              >
                {
                  !loading ? "Crear" : <Loading color="currentColor" />
                }
              </Button>
            </div>
          </form>
        </Grid>
      </Grid.Container>
    </AdminLayout>
  );
};


export default CreateAppDokku;