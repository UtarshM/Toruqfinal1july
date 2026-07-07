<?php
include("ka_include/session.php");
include("ka_include/common_function.php");
include("ka_include/ka_config.php");
include("ka_include/check_admin_login.php");
$tod_date = date("Y-m-d");
$upc_date = date("Y-m-d", strtotime($tod_date . ' + 3 days'));
// Check Module Rights
$query_module_detail = "SELECT * FROM admin_login ld where adm_id='".$_SESSION['adm_id']."' and adm_status=1";
$module_query = $con->query($query_module_detail);
$row_md_id = $module_query->fetch_array();

$rem_date = new DateTime('now');
$la_da = $rem_date->format('Y-m-d');



$md_right = explode(",", $row_md_id['md_id']);
// if (in_array("3", $md_right)) {
  

  if ($_SESSION['adm_type'] == 0) { // Admin 

    

    $query_followup = "SELECT * FROM glb_flp_detail td, admin_login al, global_detail fd  where td.glb_id=fd.glb_id and td.branch_id=" . $_SESSION['adm_branch'] . " and al.adm_id=fd.glb_adm_id and Date(td.glbflp_reminder_date) >= '$tod_date' and Date(td.glbflp_reminder_date) <= '$upc_date'  ORDER BY td.glbflp_id DESC";
    $result_flow_tot = $con->query($query_followup);
    $total_records_flow = $result_flow_tot->num_rows;

    $query_followup_tk = "SELECT * FROM tkn_flp_detail td, admin_login al, taken_detail fd  where td.tkn_id=fd.tkn_id and td.branch_id=" . $_SESSION['adm_branch'] . " and al.adm_id=fd.tkn_adm_id and Date(td.tknflp_reminder_date) >= '$tod_date' and Date(td.tknflp_reminder_date) <= '$upc_date'  ORDER BY td.tknflp_id DESC";
    $result_flow_tk_tot = $con->query($query_followup_tk);
    $total_records_flow_tk = $result_flow_tk_tot->num_rows;
    
    $query_followup_rn = "SELECT * FROM ren_flp_detail td, admin_login al, renewal_detail fd  where td.ren_id=fd.ren_id and td.branch_id=" . $_SESSION['adm_branch'] . " and al.adm_id=fd.ren_adm_id and Date(td.renflp_reminder_date) >= '$tod_date' and Date(td.renflp_reminder_date) <= '$upc_date'  ORDER BY td.renflp_id DESC";
    $result_flow_rn_tot = $con->query($query_followup_rn);
    $total_records_flow_rn = $result_flow_rn_tot->num_rows;

    $query_clm_tot = "SELECT * FROM claim_detail td,  status_detail st where td.clm_status!=3 and td.clm_action=1 and st.status_id=td.clm_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.clm_id";
      $result_clm_tot = $con->query( $query_clm_tot );
      $total_records_clm = $result_clm_tot->num_rows;
      // echo "T: ".$query_clm_tot; exit;

    $query_clm = "SELECT * FROM claim_detail td, status_detail st where td.clm_status!=3 and td.clm_action=1 and st.status_id=td.clm_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.clm_id";

    // // Check Module Rights
    // $query_rem_tot = "SELECT * FROM renewal_detail td,  status_detail st  where td.ren_status!=3 and td.ren_action IN (1,2) AND ( Date(td.ren_insurance_date) <= '$la_da'  OR Date(td.ren_permit_date) <= '$la_da'  OR Date(td.ren_nat_permit_date) <= '$la_da') and st.status_id=td.ren_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.ren_id";
    // $result_tot_rem = $con->query( $query_rem_tot );
    // $total_records_rem = $result_tot_rem->num_rows;

    // $query_rem = "SELECT * FROM renewal_detail td, status_detail st  where td.ren_status!=3 and td.ren_action IN (1,2) AND ( Date(td.ren_insurance_date) <= '$la_da'  OR Date(td.ren_permit_date) <= '$la_da'  OR Date(td.ren_nat_permit_date) <= '$la_da') and st.status_id=td.ren_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.ren_id";
  } else {

    // echo "TEST LP Fl : ".$_SESSION['adm_type']; exit;

    $query_followup = "SELECT * FROM glb_flp_detail td, admin_login al, global_detail fd  where td.glb_id=fd.glb_id and td.branch_id=" . $_SESSION['adm_branch'] . " and fd.glb_adm_id=".$_SESSION['adm_id']." and al.adm_id=fd.glb_adm_id and Date(td.glbflp_reminder_date) >= '$tod_date' and Date(td.glbflp_reminder_date) <= '$upc_date'  ORDER BY td.glbflp_id DESC";
    $result_flow_tot = $con->query($query_followup);
    $total_records_flow = $result_flow_tot->num_rows;
    

    $query_followup_tk = "SELECT * FROM tkn_flp_detail td, admin_login al, taken_detail fd  where td.tkn_id=fd.tkn_id and td.branch_id=" . $_SESSION['adm_branch'] . " and fd.tkn_adm_id=".$_SESSION['adm_id']." and al.adm_id=fd.tkn_adm_id and Date(td.tknflp_reminder_date) >= '$tod_date' and Date(td.tknflp_reminder_date) <= '$upc_date'  ORDER BY td.tknflp_id DESC";
    $result_flow_tk_tot = $con->query($query_followup_tk);
    $total_records_flow_tk = $result_flow_tk_tot->num_rows;
    
    $query_followup_rn = "SELECT * FROM ren_flp_detail td, admin_login al, renewal_detail fd  where td.ren_id=fd.ren_id and td.branch_id=" . $_SESSION['adm_branch'] . " and fd.ren_adm_id=".$_SESSION['adm_id']." and al.adm_id=fd.ren_adm_id and Date(td.renflp_reminder_date) >= '$tod_date' and Date(td.renflp_reminder_date) <= '$upc_date'  ORDER BY td.renflp_id DESC";
    $result_flow_rn_tot = $con->query($query_followup_rn);
    $total_records_flow_rn = $result_flow_rn_tot->num_rows;

    $query_clm_tot = "SELECT * FROM claim_detail td,  status_detail st where td.clm_status!=3 and td.clm_action=1 and st.status_id=td.clm_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.clm_adm_id=".$_SESSION[ 'adm_id' ]." ORDER BY td.clm_id";
      $result_clm_tot = $con->query( $query_clm_tot );
      $total_records_clm = $result_clm_tot->num_rows;

      $query_clm = "SELECT * FROM claim_detail td, status_detail st where td.clm_status!=3 and td.clm_action=1 and st.status_id=td.clm_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.clm_adm_id=".$_SESSION[ 'adm_id' ]." ORDER BY td.clm_id";

      // Check Module Rights
      // $query_rem_tot = "SELECT * FROM renewal_detail td,  status_detail st  where td.ren_status!=3 and td.ren_action IN (1,2) AND ( Date(td.ren_insurance_date) <= '$la_da'  OR Date(td.ren_permit_date) <= '$la_da'  OR Date(td.ren_nat_permit_date) <= '$la_da') and st.status_id=td.ren_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.ren_adm_id=".$_SESSION[ 'adm_id' ]." ORDER BY td.ren_id";
      // $result_tot_rem = $con->query( $query_rem_tot );
      // $total_records_rem = $result_tot_rem->num_rows;

      // $query_rem = "SELECT * FROM renewal_detail td, status_detail st  where td.ren_status!=3 and td.ren_action IN (1,2) AND ( Date(td.ren_insurance_date) <= '$la_da'  OR Date(td.ren_permit_date) <= '$la_da'  OR Date(td.ren_nat_permit_date) <= '$la_da') and st.status_id=td.ren_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.ren_adm_id=".$_SESSION[ 'adm_id' ]." ORDER BY td.ren_id";
  }
// }
if (in_array("15",$md_right ) ) {
  $query_expe = "SELECT * FROM ughrani_detail td  where td.ugh_status=1 and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.ugh_action=1 and Date(td.ugh_due_date) = '$tod_date' ORDER BY td.ugh_id";
}
// echo $query_expe; exit;

// print_r($md_right); exit;

?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<meta name="author" content="">
<link rel="shortcut icon" href="img/favicon.png" type="image/png">
<title>Torque Auto Advisor Dashboard - <?php echo $meta_title; ?> </title>
<link href="css/style.default.css" rel="stylesheet">
<link href="css/jquery.datatables.css" rel="stylesheet">
<script>
    function global_followup(glb_id) {
      window.open("global_followup.php?glb_id=" + glb_id, "", "height=700,width=700,left=700,top=200");
    }
    function taken_followup(tkn_id) {
      window.open("taken_followup.php?tkn_id=" + tkn_id, "", "height=700,width=700,left=700,top=200");
    }
    function renewal_followup(ren_id) {
      window.open("renewal_followup.php?ren_id="+ren_id,"", "height=700,width=700,left=700,top=200");
    }
  </script> 
<script src="js/jquery-1.11.1.min.js"></script> 
<!--<script src="js/new-jquery-3.3.1.js"></script>--> 
<script src="js/new-table.js"></script>
<link href="css/new-table.css" rel="stylesheet">
<script type="text/javascript">
    $(document).ready(function() {
       

      // DataTable
      var table = $('#example').DataTable();
      var table = $('#example_two').DataTable();
      var table = $('#example_three').DataTable();
      var table = $('#example_four').DataTable();
      var table = $('#example_five').DataTable();
      var table = $('#example_six').DataTable();

      // Apply the search
      table.columns().every(function() {
        var that = this;

        $('input', this.footer()).on('keyup change', function() {
          if (that.search() !== this.value) {
            that
              .search(this.value)
              .draw();
          }
        });
      });
    });
     
  </script>
</head>

<body>
<!-- Preloader -->
<div id="preloader">
  <div id="status"><i class="fa fa-spinner fa-spin"></i></div>
</div>
<section>
<?php include("left-column.php"); ?>
<div class="mainpanel">
<?php include("header.php"); ?>
<div class="pageheader">
  <h2><i class="fa fa-home"></i> Torque Auto Advisor Dashboard</h2>
  <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
    <ol class="breadcrumb">
      <li><a style="color:#1C1B17" href="#">Home</a></li>
      <li class="active">Torque Auto Advisor Dashboard</li>
    </ol>
  </div>
</div>
<div class="contentpanel">
  <div class="panel panel-default">
    <div class="panel-body">
      <div class="table-responsive col-md-12 col-lg-12 col-sm-12 col-xs-12">
        <h3 class="text-center" style="font-weight: bold; color: #DA261C;">Upcoming 3 Days Follow-up - Renewal</h3>
        <table id="example_three" class="table table-success mb30 table-hover table-bordered display" style="color:#000;">
          <thead bgcolor="#82c21f">
            <tr>
              <th width="25%">Renewal</th>
              <th width="50%">Notes</th>
              <th width="10%">Contact</th>
              <th width="15%">Assign</th>
              <th width="15%">Action</th>
            </tr>
          </thead>
          <tbody>
            <?php // 
                  $result_followup_rn = $con->query($query_followup_rn);
                  while ($row_followup_rn = $result_followup_rn->fetch_object()) { ?>
            <tr class="odd gradeX">
              <td><?php echo $row_followup_rn->ren_code_no . " - " . $row_followup_rn->ren_name; ?></td>
              <td><?php echo $row_followup_rn->renflp_notes; ?></td>
              <td><?php echo $row_followup_rn->ren_contact; ?></td>
              <td><?php echo $row_followup_rn->adm_username; ?></td>
              <td width="17%"><code> <a title="Follow Up" style="color:#1C1B17; cursor:pointer; " onClick="return renewal_followup(<?php echo $row_followup_rn->ren_id ?>);"><i class="fa fa-comment"></i></a> | <a title="Go To Renewal Details" target="_blank" style="color:green;" href="renewal_edit.php?ren_id=<?php echo $row_followup_rn->ren_id ?>"><i class="fa fa-eye"></i></a> <code></td>
            </tr>
            <?php  } ?>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>
<div class="contentpanel">
  <div class="panel panel-default">
    <div class="panel-body">
      <div class="table-responsive col-md-6 col-lg-6 col-sm-6 col-xs-6">
        <h3 class="text-center" style="font-weight: bold; color: #DA261C;">Upcoming 3 Days Follow-up - Taken</h3>
        <table id="example_two" class="table table-success mb30 table-hover table-bordered display" style="color:#000;">
          <thead bgcolor="#82c21f">
            <tr>
              <th width="25%">Taken</th>
              <th width="50%">Notes</th>
              <th width="10%">Contact</th>
              <th width="15%">Assign</th>
              <th width="15%">Action</th>
            </tr>
          </thead>
          <tbody>
            <?php // 
                  $result_followup = $con->query($query_followup_tk);
                  while ($row_followup = $result_followup->fetch_object()) { ?>
            <tr class="odd gradeX">
              <td><?php echo $row_followup->tkn_code_no . " - " . $row_followup->tkn_name; ?></td>
              <td><?php echo $row_followup->tknflp_notes; ?></td>
              <td><?php echo $row_followup->tkn_contact; ?></td>
              <td><?php echo $row_followup->adm_username; ?></td>
              <td width="17%"><code> <a title="Follow Up" style="color:#1C1B17; cursor:pointer; " onClick="return taken_followup(<?php echo $row_followup->tkn_id ?>);"><i class="fa fa-comment"></i></a> | <a title="Go To Taken Details" target="_blank" style="color:green;" href="taken_edit.php?tkn_id=<?php echo $row_followup->tkn_id ?>"><i class="fa fa-eye"></i></a> <code></td>
            </tr>
            <?php  } ?>
          </tbody>
        </table>
      </div>
      <div class="table-responsive col-md-6 col-lg-6 col-sm-6 col-xs-6">
        <h3 class="text-center" style="font-weight: bold; color: #DA261C;">Upcoming 3 Days Follow-up - Global</h3>
        <table id="example" class="table table-success mb30 table-hover table-bordered display" style="color:#000;">
          <thead bgcolor="#82c21f">
            <tr>
              <th width="25%">Global</th>
              <th width="50%">Notes</th>
              <th width="10%">Contact</th>
              <th width="15%">Assign</th>
              <th width="15%">Action</th>
            </tr>
          </thead>
          <tbody>
            <?php // 
                  $result_followup = $con->query($query_followup);
                  while ($row_followup = $result_followup->fetch_object()) { ?>
            <tr class="odd gradeX">
              <td><?php echo $row_followup->glb_code_no . " - " . $row_followup->glb_name; ?></td>
              <td><?php echo $row_followup->glbflp_notes; ?></td>
              <td><?php echo $row_followup->glb_contact; ?></td>
              <td><?php echo $row_followup->adm_username; ?></td>
              <td width="17%"><code> <a title="Follow Up" style="color:#1C1B17; cursor:pointer; " onClick="return global_followup(<?php echo $row_followup->glb_id ?>);"><i class="fa fa-comment"></i></a> | <a title="Go To Global Details" target="_blank" style="color:green;" href="global_edit.php?glb_id=<?php echo $row_followup->glb_id ?>"><i class="fa fa-eye"></i></a> <code></td>
            </tr>
            <?php  } ?>
          </tbody>
        </table>
      </div>
      <div class="table-responsive col-md-12 col-lg-12 col-sm-12 col-xs-12">
        <h3 class="text-center" style="font-weight: bold; color: #DA261C;">Pending Claim</h3>
        <table id="example_four" class="table table-success mb30 table-hover table-bordered display" style="color:#000;" >
          <thead bgcolor="#82c21f">
            <tr>
              <th width="5%">ID</th>
              <th width="10%">Date</th>
              <th width="10%">Accident Date</th>
              <th width="10%">Claim No</th>
              <th width="10%">Amount</th>
              <th width="10%">Reg No.</th>
              <th width="10%">Name</th>
              <th width="10%">Contact</th>
              <th width="10%">Assign</th>
              <th width="10%">Status</th>
              <th  width="10%">Action</th>
            </tr>
          </thead>
          <tbody>
            <?php
                if ( $total_records_clm != 0 ) {
                  $i = 0;
                  ?>
            <?php
                $result_clm = $con->query( $query_clm );
                while ( $row_clm = $result_clm->fetch_object() ) {
                  ?>
            <tr class="odd gradeX">
              <td ><?php echo $row_clm->clm_id;?></td>
              <td ><?php
                  $datend = new DateTime( $row_clm->clm_date );
                  echo $datend->format( 'd-m-Y' ); ?></td>
              <td ><?php
                  $datend = new DateTime( $row_clm->clm_accident );
                  echo $datend->format( 'd-m-Y' ); ?></td>
              <td><?php echo $row_clm->clm_no;?></td>
              <td><?php echo $row_clm->clm_amount;?></td>
              <td><?php echo $row_clm->clm_regno;?></td>
              <td><a title="Edit" style="color:green;" href="claim_edit.php?clm_id=<?php echo $row_clm->clm_id?>"><?php echo $row_clm->clm_name;?></a></td>
              <td><?php echo $row_clm->clm_contact;?></td>
              <td><?php
                  if($row_clm->clm_adm_id!=0) {
                    $query_asign_detail = "SELECT * FROM admin_login ld where ld.adm_id=".$row_clm->clm_adm_id;
                    $asign_query = $con->query( $query_asign_detail );
                    $row_asign = $asign_query->fetch_object();
                    $asign_name = $row_asign->adm_username;
                    echo $asign_name;

                  } ?></td>
              <td style="color: <?php if($row_clm->clm_action==1 || $row_clm->clm_action==4) { ?>red<?php } else { ?>green;<?php } ?>"><?php if($row_clm->clm_action==1) {
                      echo "Pending";
                    } elseif($row_clm->clm_action==2) {
                      echo "Settled";
                    } elseif($row_clm->clm_action==3) {
                      echo "Partially Settled";
                    } elseif($row_clm->clm_action==4) {
                      echo "Rejected";
                    }
                    ?></td>
              <td  width="17%"><code> <a target="_blank" style="color:#333;" title="Documents" href="claim_documents.php?clm_id=<?php echo $row_clm->clm_id?>"><i class="fa fa-image"></i></a> | <a title="Edit" style="color:green;" href="claim_edit.php?clm_id=<?php echo $row_clm->clm_id?>"><i class="fa fa-pen"></i></a><code></td>
            </tr>
            <?php }} ?>
          </tbody>
        </table>
      </div>
      <!-- <div class="table-responsive col-md-12 col-lg-12 col-sm-12 col-xs-12">
        <h3 class="text-center" style="font-weight: bold; color: #DA261C;">Renewal Reminder</h3>
        <table id="example_five" class="table table-success mb30 table-hover table-bordered display" style="color:#000;" >
          <thead bgcolor="#82c21f">
            <tr>
              <th width="5%">ID</th>
              <th width="10%">Insurance  Date</th>
              <th width="10%">Permit  Date</th>
              <th width="10%">National Permit Date</th>
              <th width="10%">Register No.</th>
              <th width="10%">Name</th>
              <th width="10%">Contact</th>
              <th width="10%">Status</th>
              <th  width="10%">Action</th>
            </tr>
          </thead>
          <tbody>
            <?php
                // if ( $total_records_rem != 0 ) {
                //   $i = 0;
                  ?>
            <?php
                // $result = $con->query( $query_rem );
                // while ( $row_state = $result->fetch_object() ) {
                  ?>
            <tr class="odd gradeX">
              <td ><?php // echo $row_state->ren_id;?></td>
              <?php 
                    // $rem_datend = new DateTime( $row_state->ren_insurance_date );
                    // echo $rem_datend->format( 'd-m-Y' );
                    // if ($rem_datend > $rem_date) {
                    //   echo '<td style="color: green;">' . $rem_datend->format('d-m-Y') . '</td>';
                    //   } else {
                    //       echo '<td style="color: red;">' . $rem_datend->format('d-m-Y') . '</td>';
                    //   }
                    ?>
              <?php 
                    // $rem_datend = new DateTime( $row_state->ren_permit_date );
                    // echo $rem_datend->format( 'd-m-Y' );
                    // if ($rem_datend > $rem_date) {
                    //   echo '<td style="color: green;">' . $rem_datend->format('d-m-Y') . '</td>';
                    //   } else {
                    //       echo '<td style="color: red;">' . $rem_datend->format('d-m-Y') . '</td>';
                    //   }
                    ?>
              <?php 
                   //  $rem_datend = new DateTime( $row_state->ren_nat_permit_date );
                    // echo $rem_datend->format( 'd-m-Y' );
                    // if ($rem_datend > $rem_date) {
                    //   echo '<td style="color: green;">' . $rem_datend->format('d-m-Y') . '</td>';
                    //   } else {
                    //       echo '<td style="color: red;">' . $rem_datend->format('d-m-Y') . '</td>';
                    //   }
                    ?>
              <td><?php // echo $row_state->ren_reg_no;?></td>
              <td><a title="Edit" style="color:green;" href="renewal_edit.php?ren_id=<?php // echo $row_state->ren_id?>"><?php // echo $row_state->ren_name;?></a></td>
              <td><?php // echo $row_state->ren_contact;?></td>
              <td style="color: <?php // if($row_state->ren_action==1) { ?>green<?php // } elseif($row_state->ren_action==2) { ?>red;<?php // } ?>"><?php 
              // if($row_state->ren_action==1) {
              //         echo "Confirmed";
              //       } elseif($row_state->ren_action==2) {
              //         echo "Rejected - ";
              //         $query_rejres_detail = "SELECT * FROM rej_res_detail ld where ld.rej_res_id=".$row_state->rej_res_id;
              //         $rejres_query = $con->query( $query_rejres_detail );
              //         $row_rejres = $rejres_query->fetch_object();
              //         $rejres_name = $row_rejres->rej_res_name;
              //         echo $rejres_name;
              //       } elseif($row_state->ren_action==3) {
              //         echo "Completed";
              //       }
                    ?></td>
              <td  width="17%"><code> <a  title="Follow Up"style="color:#1C1B17; cursor:pointer; " onClick="return renewal_followup(<?php //  echo $row_state->ren_id?>);" ><i class="fa fa-comment"></i></a> | <a target="_blank" style="color:#333;" title="Documents" href="renewal_documents.php?ren_id=<?php //  echo $row_state->ren_id?>"><i class="fa fa-image"></i></a> | <a title="Edit" style="color:green;" href="renewal_edit.php?ren_id=<?php //  echo $row_state->ren_id?>"><i class="fa fa-pen"></i></a>
                <?php //  if($_SESSION['adm_type']==0) { ?>
                | <a title="Delete" style="color:red;" href="javascript:deleterec(<?php //  echo $row_state->ren_id?>)"><i class="fa fa-trash"></i></a>
                <?php //  } ?>
                <code></td>
            </tr>
            <?php // }} ?>
          </tbody>
        </table>
      </div> -->
      <div class="table-responsive col-md-12 col-lg-12 col-sm-12 col-xs-12">
        <h3 class="text-center" style="font-weight: bold; color: #DA261C;">Today's - Ughrani</h3>
      
      <table id="example_six" class="table table-success mb30 table-hover table-bordered display" style="color:#000;" >
        <thead bgcolor="#82c21f">
          <tr>
            <th  width="5%">ID</th>
            <th  width="5%">No.</th>
            <th  width="10%">Name</th>
            <th  width="10%">Contact</th>
            <th  width="10%">Date</th>
            <th  width="10%">Due Date</th>
            <th width="15%">Amount</th>
            <th width="15%">Status</th>
          </tr>
        </thead>
        <tbody>
          <?php
                $result = $con->query( $query_expe );
                while ( $row_state = $result->fetch_object() ) {
                  ?>
          <tr class="odd gradeX">
            <td ><?php echo $row_state->ugh_id;?></td>
            <td ><?php echo $row_state->ugh_code_no;?></td>
            <td ><a title="Edit" style="color:green;" href="ughrani_edit.php?ugh_id=<?php echo $row_state->ugh_id?>"><?php echo $row_state->ugh_name;?></a></td>
            <td ><?php echo $row_state->ugh_contact;?></td>
            <td ><?php
                  $datend = new DateTime( $row_state->ugh_date );
                  echo $datend->format( 'D, d-m-Y' );
                  ?></td>
            <td ><?php
                  $datend = new DateTime( $row_state->ugh_due_date );
                  echo $datend->format( 'D, d-m-Y' );
                  ?></td>
            <td><?php echo "&#8377;".number_format($row_state->ugh_amount,2);?></td>
            <td style="color: <?php if($row_state->ugh_action==1) { echo"red"; } else { echo "green"; } ?>"><?php 
                  if($row_state->ugh_action==1) { echo "Pending"; }
                  if($row_state->ugh_action==2) { echo "Completed"; }
                   ?></td>
          </tr>
          <?php } ?>
        </tbody>
      </table>
      </div>
    </div>
  </div>
</div>
<!-- mainpanel --> 
<!-- rightpanel -->
</section>
<script src="js/jquery-1.11.1.min.js"></script> 
<script src="js/jquery-migrate-1.2.1.min.js"></script> 
<script src="js/jquery-ui-1.10.3.min.js"></script> 
<script src="js/bootstrap.min.js"></script> 
<script src="js/modernizr.min.js"></script> 
<script src="js/jquery.sparkline.min.js"></script> 
<script src="js/toggles.min.js"></script> 
<script src="js/retina.min.js"></script> 
<script src="js/jquery.cookies.js"></script> 
<script src="js/flot/jquery.flot.min.js"></script> 
<script src="js/flot/jquery.flot.resize.min.js"></script> 
<script src="js/flot/jquery.flot.spline.min.js"></script> 
<script src="js/morris.min.js"></script> 
<script src="js/raphael-2.1.0.min.js"></script> 
<script src="js/jquery.datatables.min.js"></script> 
<script src="js/select2.min.js"></script> 
<script src="js/custom.js"></script> 
<script>
    jQuery(document).ready(function() {
      "use strict";
      jQuery('#table1').dataTable();
      jQuery('#table2').dataTable({
        "sPaginationType": "full_numbers"
      });
      // Select2
      jQuery('select').select2({
        minimumResultsForSearch: -1
      });
      jQuery('select').removeClass('form-control');
      // Delete row in a table
      jQuery('.delete-row').click(function() {
        var c = confirm("Continue delete?");
        if (c)
          jQuery(this).closest('tr').fadeOut(function() {
            jQuery(this).remove();
          });
        return false;
      });
      // Show aciton upon row hover
      jQuery('.table-hidaction tbody tr').hover(function() {
        jQuery(this).find('.table-action-hide a').animate({
          opacity: 1
        });
      }, function() {
        jQuery(this).find('.table-action-hide a').animate({
          opacity: 0
        });
      });
    });
  </script> 
<script src="js/dashboard.js"></script>
</body>
</html>