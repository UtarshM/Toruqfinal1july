<?php

include( "ka_include/session.php" );

include( "ka_include/common_function.php" );

include( "ka_include/ka_config.php" );

include( "ka_include/check_admin_login.php" );

// Check Module Rights

$form_id = $_GET[ 'form_id' ];

$query_state_detail = "SELECT * FROM form_detail ld where ld.form_id=" . $form_id;

$result_query = $con->query( $query_state_detail );

$row_state = $result_query->fetch_object();



?>

<style>

    body {

        width: 100%;

        height: 100%;

        margin: 0;

        padding: 0;

        background-color: #FAFAFA;

        font: 12pt "arial";		

    }

    * {

        box-sizing: border-box;

        -moz-box-sizing: border-box;

    }

    .page {

        width: 210mm;

        min-height: 297mm;

        padding: 20mm;

        margin: 10mm auto;

        border: 1px #D3D3D3 solid;

        border-radius: 5px;

        background: white;

        box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);

    }

    .subpage {

        padding: 1cm;

        border: 5px #244E91 solid;

        height: 257mm;

        outline: 2cm #D9C08A solid;

		background-image:url(img/bg.png);

    }

    

    @page {

        size: A4;

        margin: 0;

    }

	.font1

	{

		font-size:14px;

		line-height:25px;

	}

	.font2

	{

		font-size:14px;

	}
    
    
	

    @media print {

        html, body {

            width: 210mm;

            height: 297mm;        

        }

        .page {

            margin: 0;

            border: initial;

            border-radius: initial;

            width: initial;

            min-height: initial;

            box-shadow: initial;

            background: initial;

            page-break-after: always;

        }		

    }
    

</style>

<div class="book">

    <div class="page">

        <div class="subpage">        	

        	<table width="100%">

              <tr>

                  <td width="20%"><img src="img/logo.jpg" width="150" /></td>

                  <td width="15%"></td>

                  <td width="85%" colspan="2" align="left" style="font-size:13px">

                  <strong style="font-size:14px">Saileshbhai</strong> <br />

                  <strong>Mobile :</strong> 8511121266 <br />

                  <strong>Email :</strong> shaileshsadhu25@gmail.com <br />

                  <strong>Address : </strong>Tirth Arcade Complex, Opp. Darbar Jin,

                  Kheda-Bagodra Highway, Dholka-382225. Dis. Ahmedabad. Gujarat. <br /><br />            

                  </td>                  

              </tr> 

              <tr><td colspan="4" style="border-top:2px solid #000;"><br /></td></tr>             

              <tr>

                  <td width="20%" class="font1"><strong>Form Code :</strong></td>

                  <td width="30%" class="font2"><?php echo $row_state->form_code_no; ?></td>

                            

                  <td width="20%" class="font1"><strong>Date :</strong></td>

                  <td width="30%" class="font2"><?php $datend   = new DateTime($row_state->form_date); echo $datend->format('d-m-Y'); ?></td>

              </tr>

              <tr>

                  <td width="20%" class="font1"><strong>Full Name  :</strong></td>

                  <td width="30%" class="font2" colspan="3"><?php echo $row_state->form_name; ?></td>

                            

                

              </tr>

              <tr>

              	  <td width="20%" class="font1"><strong>Mobile No :</strong></td>

                  <td width="30%" class="font2"><?php echo $row_state->form_contact; ?></td>

                  	

                  <td width="20%" class="font1"><strong>Alt Mobile :</strong></td>

                <td width="30%" class="font2"><?php echo $row_state->form_alt_contact; ?></td>

                            

                  

              </tr>

              <tr>

                  <td width="20%" class="font1"><strong>PAN No :</strong></td>

                  <td width="30%" class="font2"><?php echo $row_state->form_pan_no; ?></td>

                  

                  <td width="20%" class="font1"><strong>Aadhar No :</strong></td>

                  <td width="30%" class="font2"><?php echo $row_state->form_aadhar_no; ?></td>

                            

                  

              </tr>

              <tr>

                  <td width="20%" class="font1"><strong>D.O.B. :</strong></td>

                  <td width="30%" class="font2"><?php $datend   = new DateTime($row_state->form_dob); echo $datend->format('d-m-Y'); ?></td>

                  

                  <td width="20%" class="font1"><strong>Marital  :</strong></td>

                <td width="30%" class="font2"><?php if($row_state->form_marrital==1) { echo "Married";}else{ echo "Unmarried";} ?></td>

                   

                      

                  

              </tr>

              <tr>

                  <td width="20%" class="font1"><strong>Email Id  :</strong></td>

                  <td width="30%" class="font2"><?php echo $row_state->form_email; ?></td>    

              </tr>  

              <tr>

                  <td width="20%" class="font1"><strong>Proffesion :</strong></td>

                  <td width="30%" class="font2" colspan="3"><?php echo $row_state->form_proffesion; ?></td>

              </tr>             

              <tr><td class="font1" colspan="4"><strong style="border-bottom:dotted">Current Residential Address</strong></td></tr>

              

              <tr>

                  <td width="20%" class="font1"><strong>House No :</strong></td>

                  <td width="30%" class="font2"><?php echo $row_state->form_addr_house; ?></td>

                            

                  <td width="20%" class="font1"><strong>Street  :</strong></td>

                  <td width="30%" class="font2"><?php echo $row_state->form_addr_street; ?></td>

              </tr>

              

              <tr>

                  <td width="20%" class="font1"><strong>Landmark :</strong></td>

                  <td width="30%" class="font2"><?php echo $row_state->form_addr_landmark; ?></td>

                            

                  <td width="20%" class="font1"><strong>City  :</strong></td>

                  <td width="30%" class="font2"><?php echo $row_state->form_addr_city; ?></td>

              </tr>

              

              <tr>

                  <td width="20%" class="font1"><strong>Address :</strong></td>

                  <td width="30%" class="font2" colspan="3"><?php echo $row_state->form_addr_address; ?></td>

                            

                 

              </tr>

              

              <tr>

                  <td width="20%" class="font1"><strong>Pincode :</strong></td>

                  <td width="30%" class="font2"><?php echo $row_state->form_addr_pincode; ?></td>

                            

                  <td width="20%" class="font1"><strong></strong></td>

                  <td width="30%" class="font2"></td>

              </tr>

              

              <tr><td class="font1" colspan="4"><strong style="border-bottom:dotted">Loan Details</strong></td></tr>

              

              <tr>

                  <td width="20%" class="font1"><strong>Loan Name :</strong></td>

                  <td width="30%" class="font2">

                  <?php                      

					  $query_service = "SELECT * FROM service_detail WHERE service_id='".$row_state->service_id."' and service_status=1 ";

                      $result_service = $con->query( $query_service );

                      $row_service = $result_service->fetch_object();

					  echo $row_service->service_name;

					  ?> 



                   

                  </td>

                            

                  <td width="20%" class="font1"><strong>Fill By :</strong></td>

                  <td width="30%" class="font2"><?php echo $row_state->form_fill_by; ?></td>

              </tr>

              

              <tr>

                  <td width="20%" class="font1"><strong>Cheque :</strong></td>

                  <td width="30%" class="font2">

				  <?php if ($row_state->form_cheque==1) { echo "Yes"; } elseif ($row_state->form_cheque==0) { echo "No"; } ?>

                  </td>

                            

                  <td width="20%" class="font1"><strong>Fees :</strong></td>

                  <td width="30%" class="font2">

				  <?php if ($row_state->form_fees==1) { echo "Yes"; } elseif ($row_state->form_fees==0) { echo "No"; } ?>

                  </td>

              </tr>

              <tr>

                  <td width="20%" class="font1"><strong>Reason :</strong></td>

                  <td width="30%" class="font2" colspan="3"><?php echo $row_state->form_reason; ?></td>

              </tr>
				<tr>

                  <td width="20%" class="font1"><strong>Loan Amount  :</strong></td>

                  <td width="30%" class="font2" colspan="3"><?php echo number_format($row_state->form_lamount,2); ?></td>

              </tr>
              

				<tr><td colspan="4" style="border-bottom:dotted"><br /></td></tr>

              <tr>

                  <td width="20%" class="font1"><strong><br />Promissory Notes</strong></td>

                  <td width="30%" class="font2" colspan="3"></td>

              </tr>
              
              <tr>

                  <td width="20%" class="font1"><strong>Name : </strong></td>

                  <td width="30%" class="font2" colspan="3"></td>

              </tr>
              <tr>

                  <td width="20%" class="font1"><strong>Amount : </strong></td>

                  <td width="30%" class="font2" colspan="3"></td>

              </tr>
              
              <tr>

                  <td width="20%" class="font1"  colspan="3"></td>

                  <td width="30%" class="font2"><br><br><br></td>

              </tr>
              
              <tr>

                  <td width="80%" class="font1"  colspan="3"></td>

                  <td width="20%" class="font2"><div style="border: 1px solid black; padding: 25px; text-align:center; width:100px;">STAMP</div></td>

              </tr>


              

            </table>            

      </div>    

  </div>    

</div>